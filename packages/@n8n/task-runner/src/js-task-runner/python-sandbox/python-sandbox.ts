/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApplicationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { PyDict } from 'pyodide/ffi';

import type { SandboxContext } from './code-sandbox';
import { CodeSandbox } from './code-sandbox';
import { LoadPyodide } from './pyodide';
import { freezePrototypes } from '../freeze-prototypes';

type PythonSandboxContext = {
	[K in keyof SandboxContext as K extends `$${infer I}` ? `_${I}` : K]: SandboxContext[K];
};

type PyodideError = Error & { type: string };

const envAccessBlocked = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true';

// @TODO: Generate this programatically from EXPOSED_RPC_METHODS?
const PYTHON_HELPERS_CODE = `
import js

class Helpers:
    def __init__(self):
        self._js_helpers = _helpers_js
    
    async def httpRequest(self, options):
        result = await self._js_helpers.httpRequest(options)
        return result.to_py()
    
    async def getBinaryDataBuffer(self, item_index, property_name):
        result = await self._js_helpers.getBinaryDataBuffer(item_index, property_name)
        return bytes(result.to_py())
    
    async def prepareBinaryData(self, buffer, file_name=None, mime_type=None):
        result = await self._js_helpers.prepareBinaryData(buffer, file_name, mime_type)
        return result.to_py()
    
    async def setBinaryDataBuffer(self, metadata, buffer):
        result = await self._js_helpers.setBinaryDataBuffer(metadata, buffer)
        return result.to_py()
    
    async def binaryToString(self, buffer, encoding='utf8'):
        result = await self._js_helpers.binaryToString(buffer, encoding)
        return result
    
    async def assertBinaryData(self, item_index, property_name):
        result = await self._js_helpers.assertBinaryData(item_index, property_name)
        return result.to_py()
    
    async def request(self, uri_or_object, options=None):
        result = await self._js_helpers.request(uri_or_object, options)
        return result.to_py()
    
    async def getStoragePath(self):
        result = await self._js_helpers.getStoragePath()
        return result

helpers = Helpers()
`;

export class PythonSandbox extends CodeSandbox {
	private readonly context: PythonSandboxContext;

	constructor(
		context: SandboxContext,
		private pythonCode: string,
		helpers: IExecuteFunctions['helpers'],
		private readonly mode: 'secure' | 'insecure',
	) {
		super(
			{
				object: {
					singular: 'dictionary',
					plural: 'dictionaries',
				},
			},
			helpers,
		);
		// Since python doesn't allow variable names starting with `$`,
		// rename them to all to start with `_` instead
		this.context = Object.keys(context).reduce((acc, key) => {
			acc[key.startsWith('$') ? key.replace(/^\$/, '_') : key] = context[key];
			return acc;
		}, {} as PythonSandboxContext);
	}

	async runCode<T = unknown>(): Promise<T> {
		return await this.runCodeInPython<T>();
	}

	async runCodeAllItems() {
		return await this.runCodeInPython<INodeExecutionData[]>();
	}

	async runCodeEachItem(_itemIndex: number /* ignored as in Code node */) {
		return await this.runCodeInPython<INodeExecutionData>();
	}

	private async runCodeInPython<T>() {
		const packageCacheDir = await this.helpers.getStoragePath();
		const pyodide = await LoadPyodide(packageCacheDir, this.mode);

		let executionResult;
		try {
			await pyodide.runPythonAsync('jsproxy_typedict[0] = type(Object.new().as_object_map())');

			await pyodide.loadPackagesFromImports(this.pythonCode);

			const dict = pyodide.globals.get('dict');
			const globalsDict: PyDict = dict();
			for (const key of Object.keys(this.context)) {
				if ((key === '_env' && envAccessBlocked) || key === '_node') continue;
				const value = this.context[key];
				globalsDict.set(key, value);
			}

			pyodide.setStdout({ batched: (str) => this.emit('output', str) });

			globalsDict.set('_helpers_js', this.helpers);
			await pyodide.runPythonAsync(PYTHON_HELPERS_CODE, { globals: globalsDict });

			if (this.mode === 'secure') freezePrototypes();

			const runCode = `
async def __main():
${this.pythonCode
	.split('\n')
	.map((line) => '  ' + line)
	.join('\n')}
await __main()`;

			executionResult = await pyodide.runPythonAsync(runCode, { globals: globalsDict });
			globalsDict.destroy();
		} catch (error) {
			throw this.getPrettyError(error as PyodideError);
		}

		if (executionResult?.toJs) {
			return executionResult.toJs({
				dict_converter: Object.fromEntries,
				create_proxies: false,
			}) as T;
		}

		return executionResult as T;
	}

	private getPrettyError(error: PyodideError): Error {
		const errorTypeIndex = error.message.indexOf(error.type);
		if (errorTypeIndex !== -1) {
			return new ApplicationError(error.message.slice(errorTypeIndex), {
				level: ['TypeError', 'AttributeError'].includes(error.type) ? 'warning' : 'error',
			});
		}

		return error;
	}
}

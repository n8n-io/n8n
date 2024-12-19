import { ApplicationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { PyDict } from 'pyodide/ffi';

import { LoadPyodide } from './Pyodide';
import type { SandboxContext } from './Sandbox';
import { Sandbox } from './Sandbox';

type PythonSandboxContext = {
	[K in keyof SandboxContext as K extends `$${infer I}` ? `_${I}` : K]: SandboxContext[K];
};

type PyodideError = Error & { type: string };

const envAccessBlocked = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true';

export class PythonSandbox extends Sandbox {
	private readonly context: PythonSandboxContext;

	constructor(
		context: SandboxContext,
		private pythonCode: string,
		helpers: IExecuteFunctions['helpers'],
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
		const executionResult = await this.runCodeInPython<INodeExecutionData[]>();
		return this.validateRunCodeAllItems(executionResult);
	}

	async runCodeEachItem(itemIndex: number) {
		const executionResult = await this.runCodeInPython<INodeExecutionData>();
		return this.validateRunCodeEachItem(executionResult, itemIndex);
	}

	private async runCodeInPython<T>() {
		const packageCacheDir = this.helpers.getStoragePath();
		const pyodide = await LoadPyodide(packageCacheDir);

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

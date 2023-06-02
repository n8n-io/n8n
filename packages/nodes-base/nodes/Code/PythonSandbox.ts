import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { PyProxyDict } from 'pyodide';
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
		private moduleImports: string[],
		itemIndex: number | undefined,
		helpers: IExecuteFunctions['helpers'],
	) {
		super(
			{
				object: {
					singular: 'dictionary',
					plural: 'dictionaries',
				},
			},
			itemIndex,
			helpers,
		);
		// Since python doesn't allow variable names starting with `$`,
		// rename them to all to start with `_` instead
		this.context = Object.keys(context).reduce((acc, key) => {
			acc[key.startsWith('$') ? key.replace(/^\$/, '_') : key] = context[key];
			return acc;
		}, {} as PythonSandboxContext);
	}

	async runCodeAllItems() {
		const executionResult = await this.runCodeInPython<INodeExecutionData[]>();
		return this.validateRunCodeAllItems(executionResult);
	}

	async runCodeEachItem() {
		const executionResult = await this.runCodeInPython<INodeExecutionData>();
		return this.validateRunCodeEachItem(executionResult);
	}

	private async runCodeInPython<T>() {
		// Below workaround from here:
		// https://github.com/pyodide/pyodide/discussions/3537#discussioncomment-4864345
		const runCode = `
from _pyodide_core import jsproxy_typedict
from js import Object
jsproxy_typedict[0] = type(Object.new().as_object_map())

if printOverwrite:
  print = printOverwrite

async def __main():
${this.pythonCode
	.split('\n')
	.map((line) => '  ' + line)
	.join('\n')}
await __main()
`;
		const pyodide = await LoadPyodide();

		const moduleImportsFiltered = this.moduleImports.filter(
			(importModule) => !['asyncio', 'pyodide', 'math'].includes(importModule),
		);

		if (moduleImportsFiltered.length) {
			await pyodide.loadPackage('micropip');
			const micropip = pyodide.pyimport('micropip');
			await Promise.all(
				moduleImportsFiltered.map((importModule) => micropip.install(importModule)),
			);
		}

		let executionResult;
		try {
			const dict = pyodide.globals.get('dict');
			const globalsDict: PyProxyDict = dict();
			for (const key of Object.keys(this.context)) {
				if ((key === '_env' && envAccessBlocked) || key === '_node') continue;
				const value = this.context[key];
				globalsDict.set(key, value);
			}

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
			return new Error(error.message.slice(errorTypeIndex));
		}

		return error;
	}
}

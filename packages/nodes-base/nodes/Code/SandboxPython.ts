import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { CodeNodeMode } from './utils';
import { LoadPyodide } from './Pyodide';
import { Sandbox } from './Sandbox';

type PyodideError = Error & { type: string };

export class SandboxPython extends Sandbox {
	private code = '';

	private itemIndex: number | undefined = undefined;

	constructor(private nodeMode: CodeNodeMode, private helpers: IExecuteFunctions['helpers']) {
		super({
			object: {
				singular: 'dictionary',
				plural: 'dictionaries',
			},
		});
	}

	async runCode(
		context: ReturnType<typeof getSandboxContextPython>,
		code: string,
		moduleImports: string[],
		itemIndex?: number,
	) {
		this.code = code;
		this.itemIndex = itemIndex;

		return this.nodeMode === 'runOnceForAllItems'
			? this.runCodeAllItems(context, moduleImports)
			: this.runCodeEachItem(context, moduleImports);
	}

	private async runCodeInPython(
		context: ReturnType<typeof getSandboxContextPython>,
		moduleImports: string[],
	) {
		// Below workaround from here:
		// https://github.com/pyodide/pyodide/discussions/3537#discussioncomment-4864345
		const runCode = `
from _pyodide_core import jsproxy_typedict
from js import Object
jsproxy_typedict[0] = type(Object.new().as_object_map())

if printOverwrite:
  print = printOverwrite

async def __main():
${this.code
	.split('\n')
	.map((line) => '  ' + line)
	.join('\n')}
await __main()
`;
		const pyodide = await LoadPyodide();

		const moduleImportsFiltered = moduleImports.filter(
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
			const globalsDict = dict();
			for (const key of Object.keys(context)) {
				globalsDict.set(key, context[key]);
			}

			executionResult = await pyodide.runPythonAsync(runCode, { globals: globalsDict });
			globalsDict.destroy();
		} catch (error) {
			throw this.getPrettyError(error as PyodideError);
		}

		if (executionResult?.toJs) {
			return executionResult.toJs({ dict_converter: Object.fromEntries, create_proxies: false });
		}

		return executionResult;
	}

	private getPrettyError(error: PyodideError): Error {
		const errorTypeIndex = error.message.indexOf(error.type);
		if (errorTypeIndex !== -1) {
			return new Error(error.message.slice(errorTypeIndex));
		}

		return error;
	}

	private async runCodeAllItems(
		context: ReturnType<typeof getSandboxContextPython>,
		moduleImports: string[],
	) {
		const executionResult = await this.runCodeInPython(context, moduleImports);

		this.validateRunCodeAllItems(executionResult as INodeExecutionData[], this.itemIndex);

		return this.helpers.normalizeItems(executionResult as INodeExecutionData[]);
	}

	private async runCodeEachItem(
		context: ReturnType<typeof getSandboxContextPython>,
		moduleImports: string[],
	) {
		const executionResult = await this.runCodeInPython(context, moduleImports);

		this.validateRunCodeEachItem(executionResult as INodeExecutionData, false, this.itemIndex);

		return executionResult.json ? executionResult : { json: executionResult };
	}
}

export function getSandboxContextPython(
	this: IExecuteFunctions,
	index: number,
): Record<string, unknown> {
	const item = this.getWorkflowDataProxy(index);

	return {
		// from NodeExecuteFunctions
		_getNodeParameter: this.getNodeParameter,
		_getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,
		_: item.$,
		_execution: item.$execution,
		_input: item.$input,
		_item: this.getWorkflowDataProxy,
		_itemIndex: item.$itemIndex,
		_jmesPath: item.$jmesPath,
		_mode: item.$mode,
		_now: item.$now,
		_parameter: item.$parameter,
		_prevNode: item.$prevNode,
		_runIndex: item.$runIndex,
		_self: item.$self,
		_today: item.$today,
		_workflow: item.$workflow,
		DateTime: item.DateTime,
		Duration: item.Duration,
		Interval: item.Interval,
	};
}

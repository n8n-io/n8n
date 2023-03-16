import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ValidationError } from './ValidationError';
import type { CodeNodeMode } from './utils';
import { isObject, REQUIRED_N8N_ITEM_KEYS } from './utils';
import { LoadPyodide } from './Pyodide';

type PyodideError = Error & { type: string };

export class SandboxPython {
	private code = '';

	private itemIndex: number | undefined = undefined;

	constructor(private nodeMode: CodeNodeMode) {}

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

		if (
			executionResult === undefined ||
			executionResult === null ||
			typeof executionResult !== 'object'
		) {
			throw new ValidationError({
				message: "Code doesn't return items properly",
				description:
					'Please return an array of dictionaries, one for each item you would like to output',
				itemIndex: this.itemIndex,
			});
		}

		if (Array.isArray(executionResult)) {
			for (const item of executionResult) {
				if (item.json !== undefined && !isObject(item.json)) {
					throw new ValidationError({
						message: "A 'json' property isn't a dictionary",
						description: "In the returned data, every key named 'json' must point to a dictionary",
						itemIndex: this.itemIndex,
					});
				}

				// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
				// then validate all keys to be a supported item key, else allow user keys
				// to be wrapped in `json` when normalizing items below.

				if (
					executionResult.some((resultItem) =>
						Object.keys(resultItem).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)),
					)
				) {
					Object.keys(item).forEach((key) => {
						if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;

						throw new ValidationError({
							message: `Unknown top-level item key: ${key}`,
							description: 'Access the properties of an item under `json`, e.g. `item["json"]`',
							itemIndex: this.itemIndex,
						});
					});
				}

				if (item.binary !== undefined && !isObject(item.binary)) {
					throw new ValidationError({
						message: "A 'binary' property isn't a dictionary",
						description:
							"In the returned data, every key named 'binary’ must point to an dictionary.",
						itemIndex: this.itemIndex,
					});
				}
			}
		} else {
			if (executionResult.json !== undefined && !isObject(executionResult.json)) {
				throw new ValidationError({
					message: "A 'json' property isn't a dictionary",
					description: "In the returned data, every key named 'json' must point to a dictionary",
					itemIndex: this.itemIndex,
				});
			}

			if (executionResult.binary !== undefined && !isObject(executionResult.binary)) {
				throw new ValidationError({
					message: "A 'binary' property isn't a dictionary",
					description: "In the returned data, every key named 'binary’ must point to a dictionary.",
					itemIndex: this.itemIndex,
				});
			}
		}

		return normalizeItems(executionResult as INodeExecutionData[]);
	}

	private async runCodeEachItem(
		context: ReturnType<typeof getSandboxContextPython>,
		moduleImports: string[],
	) {
		let executionResult = await this.runCodeInPython(context, moduleImports);
		if (
			executionResult === undefined ||
			executionResult === null ||
			typeof executionResult !== 'object'
		) {
			throw new ValidationError({
				message: "Code doesn't return a dictionary",
				description: `Please return a dictionary representing the output item. ('${executionResult}' was returned instead.)`,
				itemIndex: this.itemIndex,
			});
		}

		executionResult = executionResult as INodeExecutionData;

		if (executionResult.json !== undefined && !isObject(executionResult.json)) {
			throw new ValidationError({
				message: "A 'json' property isn't a dictionary",
				description: "In the returned data, every key named 'json' must point to a dictionary",
				itemIndex: this.itemIndex,
			});
		}
		if (executionResult.binary !== undefined && !isObject(executionResult.binary)) {
			throw new ValidationError({
				message: "A 'binary' property isn't a dictionary",
				description: "In the returned data, every key named 'binary’ must point to a dictionary.",
				itemIndex: this.itemIndex,
			});
		}
		if (Array.isArray(executionResult)) {
			const firstSentence =
				executionResult.length > 0
					? `An array of ${typeof executionResult[0]}s was returned.`
					: 'An empty array was returned.';
			throw new ValidationError({
				message: "Code doesn't return a single dictionary",
				description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead`,
				itemIndex: this.itemIndex,
			});
		}
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

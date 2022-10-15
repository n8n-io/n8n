import { normalizeItems } from 'n8n-core';
import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
import { CodeNodeMode, isObject, SUPPORTED_ITEM_KEYS } from './utils';

const { python, builtins } = require('pythonia');

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	IWorkflowDataProxyData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

// export class SandboxPython extends NodeVM {
export class SandboxPython {
	private code = '';
	private itemIndex: number | undefined = undefined;

	// private context: ReturnType<typeof getSandboxContextPython>;
	private nodeMode: CodeNodeMode;
	private workflowMode: WorkflowExecuteMode;

	constructor(
		// context: ReturnType<typeof getSandboxContextPython>,
		workflowMode: WorkflowExecuteMode,
		nodeMode: CodeNodeMode,
	) {
		// this.context = context;
		this.nodeMode = nodeMode;
		this.workflowMode = workflowMode;
	}

	close() {
		python.exit();
	}

	async runCodeInPython(context: ReturnType<typeof getSandboxContextPython>) {
		const runCode = `
def cleanup_proxy_data(data):
  if getattr(data, '__module__', None) == 'proxy':
    return data.valueOf()
  elif type(data) is list:
    for id, value in enumerate(data):
      data[id] = cleanup_proxy_data(value)
  elif type(data) is dict:
    for key in data:
      data[key] = cleanup_proxy_data(data[key])
  return data
def main():
${this.code
	.split('\n')
	.map((line) => '  ' + line)
	.join('\n')}
responseCallback(cleanup_proxy_data(main()))
`;

		let executionResult = undefined;

		const responseCallback = (
			data: IDataObject | IDataObject[] | INodeExecutionData | INodeExecutionData[],
		) => {
			executionResult = data;
		};

		try {
			// python.setFastMode(false);
			await builtins.exec(runCode, {
				...context,
				responseCallback,
			});
		} catch (error) {
			throw new ExecutionError(error);
		}

		return executionResult as
			| undefined
			| null
			| IDataObject
			| IDataObject[]
			| INodeExecutionData
			| INodeExecutionData[];
	}

	async runCode(
		context: ReturnType<typeof getSandboxContextPython>,
		code: string,
		itemIndex?: number,
	) {
		this.code = code;
		this.itemIndex = itemIndex;

		return this.nodeMode === 'runOnceForAllItems'
			? this.runCodeAllItems(context)
			: this.runCodeEachItem(context);
	}

	private async runCodeAllItems(context: ReturnType<typeof getSandboxContextPython>) {
		const executionResult = await this.runCodeInPython(context);

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
					executionResult.some((item) =>
						Object.keys(item).find((key) => SUPPORTED_ITEM_KEYS.has(key)),
					)
				) {
					Object.keys(item).forEach((key) => {
						if (SUPPORTED_ITEM_KEYS.has(key)) return;

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

	private async runCodeEachItem(context: ReturnType<typeof getSandboxContextPython>) {
		let executionResult = await this.runCodeInPython(context);
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
	index?: number,
): Record<string, unknown> {
	const item = this.getWorkflowDataProxy(index ?? 0);

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
		_node: item.$node,
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

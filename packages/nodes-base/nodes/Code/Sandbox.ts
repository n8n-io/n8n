import { normalizeItems } from 'n8n-core';
import type { NodeVMOptions } from 'vm2';
import { NodeVM } from 'vm2';
import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
import type { CodeNodeMode } from './utils';
import { isObject, REQUIRED_N8N_ITEM_KEYS } from './utils';

import type { IExecuteFunctions, IWorkflowDataProxyData, WorkflowExecuteMode } from 'n8n-workflow';

export class Sandbox extends NodeVM {
	private jsCode = '';

	private itemIndex: number | undefined = undefined;

	constructor(
		context: ReturnType<typeof getSandboxContext>,
		workflowMode: WorkflowExecuteMode,
		private nodeMode: CodeNodeMode,
	) {
		super(Sandbox.getSandboxOptions(context, workflowMode));
	}

	static getSandboxOptions(
		context: ReturnType<typeof getSandboxContext>,
		workflowMode: WorkflowExecuteMode,
	): NodeVMOptions {
		const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
			process.env;

		return {
			console: workflowMode === 'manual' ? 'redirect' : 'inherit',
			sandbox: context,
			require: {
				builtin: builtIn ? builtIn.split(',') : [],
				external: external ? { modules: external.split(','), transitive: false } : false,
			},
		};
	}

	async runCode(jsCode: string, itemIndex?: number) {
		this.jsCode = jsCode;
		this.itemIndex = itemIndex;

		return this.nodeMode === 'runOnceForAllItems' ? this.runCodeAllItems() : this.runCodeEachItem();
	}

	private async runCodeAllItems() {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		let executionResult;

		try {
			executionResult = await this.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `items` to pre-exist as in Function Item node
			if (error.message === 'items is not defined' && !/(let|const|var) items =/.test(script)) {
				const quoted = error.message.replace('items', '`items`');
				error.message = (quoted as string) + '. Did you mean `$input.all()`?';
			}

			throw new ExecutionError(error);
		}

		if (executionResult === null) return [];

		if (executionResult === undefined || typeof executionResult !== 'object') {
			throw new ValidationError({
				message: "Code doesn't return items properly",
				description:
					'Please return an array of objects, one for each item you would like to output',
				itemIndex: this.itemIndex,
			});
		}

		if (Array.isArray(executionResult)) {
			/**
			 * If at least one top-level key is an n8n item key (`json`, `binary`, etc.),
			 * then require all item keys to be an n8n item key.
			 *
			 * If no top-level key is an n8n key, then skip this check, allowing non-n8n
			 * item keys to be wrapped in `json` when normalizing items below.
			 */
			const mustHaveTopLevelN8nKey = executionResult.some((item) =>
				Object.keys(item).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)),
			);

			for (const item of executionResult) {
				if (item.json !== undefined && !isObject(item.json)) {
					throw new ValidationError({
						message: "A 'json' property isn't an object",
						description: "In the returned data, every key named 'json' must point to an object",
						itemIndex: this.itemIndex,
					});
				}

				if (mustHaveTopLevelN8nKey) {
					Object.keys(item).forEach((key) => {
						if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;
						throw new ValidationError({
							message: `Unknown top-level item key: ${key}`,
							description: 'Access the properties of an item under `.json`, e.g. `item.json`',
							itemIndex: this.itemIndex,
						});
					});
				}

				if (item.binary !== undefined && !isObject(item.binary)) {
					throw new ValidationError({
						message: "A 'binary' property isn't an object",
						description: "In the returned data, every key named 'binary’ must point to an object.",
						itemIndex: this.itemIndex,
					});
				}
			}
		} else {
			if (executionResult.json !== undefined && !isObject(executionResult.json)) {
				throw new ValidationError({
					message: "A 'json' property isn't an object",
					description: "In the returned data, every key named 'json' must point to an object",
					itemIndex: this.itemIndex,
				});
			}

			if (executionResult.binary !== undefined && !isObject(executionResult.binary)) {
				throw new ValidationError({
					message: "A 'binary' property isn't an object",
					description: "In the returned data, every key named 'binary’ must point to an object.",
					itemIndex: this.itemIndex,
				});
			}
		}

		return normalizeItems(executionResult);
	}

	private async runCodeEachItem() {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		const match = this.jsCode.match(/\$input\.(?<disallowedMethod>first|last|all|itemMatching)/);

		if (match?.groups?.disallowedMethod) {
			const { disallowedMethod } = match.groups;

			const lineNumber =
				this.jsCode.split('\n').findIndex((line) => {
					return line.includes(disallowedMethod) && !line.startsWith('//') && !line.startsWith('*');
				}) + 1;

			const disallowedMethodFound = lineNumber !== 0;

			if (disallowedMethodFound) {
				throw new ValidationError({
					message: `Can't use .${disallowedMethod}() here`,
					description: "This is only available in 'Run Once for All Items' mode",
					itemIndex: this.itemIndex,
					lineNumber,
				});
			}
		}

		let executionResult;

		try {
			executionResult = await this.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `item` to pre-exist as in Function Item node
			if (error.message === 'item is not defined' && !/(let|const|var) item =/.test(script)) {
				const quoted = error.message.replace('item', '`item`');
				error.message = (quoted as string) + '. Did you mean `$input.item.json`?';
			}

			throw new ExecutionError(error, this.itemIndex);
		}

		if (executionResult === null) return;

		if (executionResult === undefined || typeof executionResult !== 'object') {
			throw new ValidationError({
				message: "Code doesn't return an object",
				description: `Please return an object representing the output item. ('${executionResult}' was returned instead.)`,
				itemIndex: this.itemIndex,
			});
		}

		if (executionResult.json !== undefined && !isObject(executionResult.json)) {
			throw new ValidationError({
				message: "A 'json' property isn't an object",
				description: "In the returned data, every key named 'json' must point to an object",
				itemIndex: this.itemIndex,
			});
		}

		if (executionResult.binary !== undefined && !isObject(executionResult.binary)) {
			throw new ValidationError({
				message: "A 'binary' property isn't an object",
				description: "In the returned data, every key named 'binary’ must point to an object.",
				itemIndex: this.itemIndex,
			});
		}

		// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
		// and another top-level key is unrecognized, then the user mis-added a property
		// directly on the item, when they intended to add it on the `json` property

		Object.keys(executionResult).forEach((key) => {
			if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;

			throw new ValidationError({
				message: `Unknown top-level item key: ${key}`,
				description: 'Access the properties of an item under `.json`, e.g. `item.json`',
				itemIndex: this.itemIndex,
			});
		});

		if (Array.isArray(executionResult)) {
			const firstSentence =
				executionResult.length > 0
					? `An array of ${typeof executionResult[0]}s was returned.`
					: 'An empty array was returned.';

			throw new ValidationError({
				message: "Code doesn't return a single object",
				description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead`,
				itemIndex: this.itemIndex,
			});
		}

		return executionResult.json ? executionResult : { json: executionResult };
	}
}

export function getSandboxContext(this: IExecuteFunctions, index?: number) {
	const sandboxContext: Record<string, unknown> & {
		$item: (i: number) => IWorkflowDataProxyData;
		$input: any;
	} = {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,

		// to bring in all $-prefixed vars and methods from WorkflowDataProxy
		$item: this.getWorkflowDataProxy,
		$input: null,
	};

	// $node, $items(), $parameter, $json, $env, etc.
	Object.assign(sandboxContext, sandboxContext.$item(index ?? 0));

	return sandboxContext;
}

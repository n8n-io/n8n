import { normalizeItems } from 'n8n-core';
import { NodeVM, NodeVMOptions } from 'vm2';
import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
import { CodeNodeMode, isObject } from './utils';

import type { IExecuteFunctions, WorkflowExecuteMode } from 'n8n-workflow';

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

		const match = script.match(
			/(?<disallowedSyntax>\)\.item|\$input\.item|\$json|\$binary|\$itemIndex)/,
		);

		if (match?.groups?.disallowedSyntax) {
			const { disallowedSyntax } = match.groups;

			const lineNumber =
				this.jsCode.split('\n').findIndex((line) => {
					return line.includes(disallowedSyntax) && !line.startsWith('//') && !line.startsWith('*');
				}) + 1;

			const disallowedSyntaxFound = lineNumber !== 0;

			if (disallowedSyntaxFound) {
				throw new ValidationError({
					message: `Can't use ${disallowedSyntax} here`,
					description: "This is only available in 'Run Once for Each Item' mode",
					itemIndex: this.itemIndex,
					lineNumber,
				});
			}
		}

		let executionResult;

		try {
			executionResult = await this.run(script, __dirname);
		} catch (error) {
			throw new ExecutionError(error);
		}

		if (executionResult === undefined) {
			throw new ValidationError({
				message: "Code doesn't return items properly",
				description:
					'Please return an array of objects, one for each item you would like to output',
				itemIndex: this.itemIndex,
			});
		}

		if (Array.isArray(executionResult)) {
			for (let item of executionResult) {
				if (item.json !== undefined && !isObject(item.json)) {
					throw new ValidationError({
						message: "A 'json' property isn't an object",
						description: "In the returned data, every key named 'json' must point to an object",
						itemIndex: this.itemIndex,
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

		if (executionResult === null) executionResult = [];

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
			console.log(error);
			throw new ExecutionError(error, this.itemIndex);
		}

		if (executionResult === undefined) {
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

export function getSandboxContext(this: IExecuteFunctions) {
	const sandboxContext: Record<string, unknown> & { $item: (i: number) => object } = {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,

		// to bring in all $-prefixed vars and methods from WorkflowDataProxy
		$item: this.getWorkflowDataProxy,
	};

	// $node, $items(), $parameter, $json, $env, etc.
	Object.assign(sandboxContext, sandboxContext.$item(0));

	return sandboxContext;
}

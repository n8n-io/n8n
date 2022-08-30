import { normalizeItems } from 'n8n-core';
import { NodeVM, NodeVMOptions } from 'vm2';
import { CodeNodeMode, isObject } from './utils';
import { EndScriptError, END_SCRIPT_ERRORS } from './errors';
import type { IExecuteFunctions, INodeExecutionData, WorkflowExecuteMode } from 'n8n-workflow';

export class Sandbox extends NodeVM {
	private jsCode = '';

	constructor(
		context: ReturnType<typeof getSandboxContext>,
		workflowMode: WorkflowExecuteMode,
		private nodeMode: CodeNodeMode,
	) {
		const options = Sandbox.getSandboxOptions(context, workflowMode);
		super(options);
	}

	private static getSandboxOptions(
		context: ReturnType<typeof getSandboxContext>,
		workflowMode: WorkflowExecuteMode,
	) {
		const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
			process.env;

		const sandboxOptions: NodeVMOptions = {
			console: workflowMode === 'manual' ? 'redirect' : 'inherit',
			sandbox: context,
			require: {
				builtin: builtIn ? builtIn.split(',') : [],
				external: external ? { modules: external.split(','), transitive: false } : false,
			},
		};

		return sandboxOptions;
	}

	async runCode(jsCode: string) {
		this.jsCode = jsCode;

		return this.nodeMode === 'runOnceForAllItems'
			? this.runCodeAllItems()
			: this.runCodeSingleItem();
	}

	private async runCodeAllItems() {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;
		const executionResult = await this.run(script, __dirname);

		this.validateExecutionResult(executionResult);

		return normalizeItems(executionResult);
	}

	private async runCodeSingleItem() {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;
		const result = await this.run(script, __dirname);

		this.validateExecutionResult(result);

		return result;
	}

	private validateExecutionResult(result: unknown) {
		if (this.nodeMode === 'runOnceForAllItems') {
			if (result === undefined || result === null) {
				throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.ALL_ITEMS.NO_OUTPUT);
			}

			if (!Array.isArray(result)) {
				throw new EndScriptError(
					this.jsCode,
					END_SCRIPT_ERRORS.ALL_ITEMS.OUTPUT_OBJECT_INSTEAD_OF_ARRAY,
				);
			}

			for (const item of result) {
				if (item.json === undefined) {
					throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.ALL_ITEMS.OUTPUT_NO_JSON);
				}

				if (!isObject(item.json)) {
					throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.ALL_ITEMS.OUTPUT_JSON_NOT_OBJECT);
				}

				if (item.binary !== undefined && !isObject(item.binary)) {
					throw new EndScriptError(
						this.jsCode,
						END_SCRIPT_ERRORS.ALL_ITEMS.OUTPUT_BINARY_NOT_OBJECT,
					);
				}
			}

			return;
		}

		// runOnceForEachItem

		if (result === undefined || result === null) {
			throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.EACH_ITEM.NO_OUTPUT);
		}

		if (Array.isArray(result)) {
			throw new EndScriptError(
				this.jsCode,
				END_SCRIPT_ERRORS.EACH_ITEM.OUTPUT_ARRAY_INSTEAD_OF_OBJECT,
			);
		}

		if (!isObject(result)) {
			throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.EACH_ITEM.OUTPUT_JSON_NOT_OBJECT);
		}

		if (!isObject(result.json)) {
			throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.EACH_ITEM.OUTPUT_NO_JSON);
		}

		if (result.binary !== undefined && !isObject(result.binary)) {
			throw new EndScriptError(this.jsCode, END_SCRIPT_ERRORS.ALL_ITEMS.OUTPUT_BINARY_NOT_OBJECT);
		}
	}
}

export function getSandboxContext(
	this: IExecuteFunctions,
	input: INodeExecutionData[],
	nodeMode: CodeNodeMode,
) {
	const sandboxContext: Record<string, unknown> & { $item: (i: number) => object } = {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,

		// from WorkflowDataProxy, to bring in all $-prefixed vars and methods
		$item: this.getWorkflowDataProxy,
	};

	// from WorkflowDataProxy: $node, $items(), $parameter, $json, $env, etc.
	Object.assign(sandboxContext, sandboxContext.$item(0));

	// from local context
	if (nodeMode === 'runOnceForAllItems') {
		sandboxContext.$nodeItems = input;
	} else if (nodeMode === 'runOnceForEachItem') {
		const [item] = input;
		sandboxContext.$nodeItem = item;
		// @TODO: getBinaryData, setBinaryData
	}

	return sandboxContext;
}

import type { NodeVMOptions } from 'vm2';
import { NodeVM } from 'vm2';
import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
import type { CodeNodeMode } from './utils';

import type {
	IExecuteFunctions,
	INodeExecutionData,
	IWorkflowDataProxyData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { Sandbox } from './Sandbox';

export class SandboxJavaScript extends Sandbox {
	private jsCode = '';

	private itemIndex: number | undefined = undefined;

	vm: NodeVM;

	constructor(
		context: ReturnType<typeof getSandboxContext>,
		workflowMode: WorkflowExecuteMode,
		private nodeMode: CodeNodeMode,
		private helpers: IExecuteFunctions['helpers'],
	) {
		super({
			object: {
				singular: 'object',
				plural: 'objects',
			},
		});
		this.vm = new NodeVM(SandboxJavaScript.getSandboxOptions(context, workflowMode));
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
			executionResult = await this.vm.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `items` to pre-exist as in Function Item node
			if (error.message === 'items is not defined' && !/(let|const|var) items =/.test(script)) {
				const quoted = error.message.replace('items', '`items`');
				error.message = (quoted as string) + '. Did you mean `$input.all()`?';
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			throw new ExecutionError(error);
		}

		if (executionResult === null) return [];

		executionResult = executionResult as INodeExecutionData[];

		this.validateRunCodeAllItems(executionResult);

		return this.helpers.normalizeItems(executionResult);
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
			executionResult = await this.vm.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `item` to pre-exist as in Function Item node
			if (error.message === 'item is not defined' && !/(let|const|var) item =/.test(script)) {
				const quoted = error.message.replace('item', '`item`');
				error.message = (quoted as string) + '. Did you mean `$input.item.json`?';
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			throw new ExecutionError(error, this.itemIndex);
		}

		if (executionResult === null) return;

		this.validateRunCodeEachItem(executionResult as INodeExecutionData, false, this.itemIndex);

		return executionResult.json ? executionResult : { json: executionResult };
	}
}

export function getSandboxContext(
	this: IExecuteFunctions,
	index: number,
): Record<string, unknown> & IWorkflowDataProxyData {
	return {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,

		// $node, $items(), $parameter, $json, $env, etc.
		...this.getWorkflowDataProxy(index),
	};
}

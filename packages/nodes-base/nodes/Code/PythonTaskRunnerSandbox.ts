import {
	type CodeExecutionMode,
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import type { TextKeys } from './result-validation';
import { validateRunCodeAllItems, validateRunCodeEachItem } from './result-validation';
import { throwExecutionError } from './throw-execution-error';

const PYTHON_TEXT_KEYS: TextKeys = {
	object: { singular: 'dictionary', plural: 'dictionaries' },
};

export class PythonTaskRunnerSandbox {
	constructor(
		private readonly pythonCode: string,
		private readonly nodeMode: CodeExecutionMode,
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: IExecuteFunctions,
	) {}

	/**
	 * Run a script by forwarding it to a Python task runner, together with input items.
	 *
	 * The Python runner receives input items together with the task, whereas the
	 * JavaScript runner does _not_ receive input items together with the task and
	 * instead retrieves them later, only if needed, via an RPC request.
	 */
	async runUsingIncomingItems() {
		const itemIndex = 0;

		const node = this.executeFunctions.getNode();
		const workflow = this.executeFunctions.getWorkflow();

		const taskSettings: Record<string, unknown> = {
			code: this.pythonCode,
			nodeMode: this.nodeMode,
			workflowMode: this.workflowMode,
			continueOnFail: this.executeFunctions.continueOnFail(),
			items: this.executeFunctions.getInputData(),
			nodeId: node.id,
			nodeName: node.name,
			workflowId: workflow.id,
			workflowName: workflow.name,
		};

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			'python',
			taskSettings,
			itemIndex,
		);

		if (!executionResult.ok) {
			return throwExecutionError('error' in executionResult ? executionResult.error : {});
		}

		if (this.nodeMode === 'runOnceForAllItems') {
			return validateRunCodeAllItems(
				executionResult.result,
				PYTHON_TEXT_KEYS,
				this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers),
			);
		}

		return executionResult.result.map((item, index) =>
			validateRunCodeEachItem(
				item,
				index,
				PYTHON_TEXT_KEYS,
				this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers),
			),
		);
	}
}

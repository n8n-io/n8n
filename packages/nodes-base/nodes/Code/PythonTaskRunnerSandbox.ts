import {
	type CodeExecutionMode,
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { throwExecutionError } from './throw-execution-error';

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

		const taskSettings: Record<string, unknown> = {
			code: this.pythonCode,
			nodeMode: this.nodeMode,
			workflowMode: this.workflowMode,
			continueOnFail: this.executeFunctions.continueOnFail(),
			items: this.executeFunctions.getInputData(),
		};

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			'python',
			taskSettings,
			itemIndex,
		);

		return executionResult.ok
			? executionResult.result
			: throwExecutionError('error' in executionResult ? executionResult.error : {});
	}
}

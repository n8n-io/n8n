import {
	ApplicationError,
	type CodeExecutionMode,
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { isWrappableError, WrappedExecutionError } from './errors/WrappedExecutionError';
import { validateNoDisallowedMethodsInRunForEach } from './JsCodeValidator';

/**
 * JS Code execution sandbox that executes the JS code using task runner.
 */
export class JsTaskRunnerSandbox {
	constructor(
		private readonly jsCode: string,
		private readonly nodeMode: CodeExecutionMode,
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: IExecuteFunctions,
	) {}

	async runCodeAllItems(): Promise<INodeExecutionData[]> {
		const itemIndex = 0;

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			'javascript',
			{
				code: this.jsCode,
				nodeMode: this.nodeMode,
				workflowMode: this.workflowMode,
				continueOnFail: this.executeFunctions.continueOnFail(),
			},
			itemIndex,
		);

		return executionResult.ok
			? executionResult.result
			: this.throwExecutionError(executionResult.error);
	}

	async runCodeForEachItem(): Promise<INodeExecutionData[]> {
		validateNoDisallowedMethodsInRunForEach(this.jsCode, 0);
		const itemIndex = 0;

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			'javascript',
			{
				code: this.jsCode,
				nodeMode: this.nodeMode,
				workflowMode: this.workflowMode,
				continueOnFail: this.executeFunctions.continueOnFail(),
			},
			itemIndex,
		);

		return executionResult.ok
			? executionResult.result
			: this.throwExecutionError(executionResult.error);
	}

	private throwExecutionError(error: unknown): never {
		// The error coming from task runner is not an instance of error,
		// so we need to wrap it in an error instance.
		if (isWrappableError(error)) {
			throw new WrappedExecutionError(error);
		}

		throw new ApplicationError('Unknown error', {
			cause: error,
		});
	}
}

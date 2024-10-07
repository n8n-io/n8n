import {
	ensureError,
	type CodeExecutionMode,
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { ExecutionError } from './ExecutionError';
import {
	mapItemsNotDefinedErrorIfNeededForRunForAll,
	validateNoDisallowedMethodsInRunForEach,
} from './JsCodeValidator';

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

	async runCode<T = unknown>(): Promise<T> {
		const itemIndex = 0;

		try {
			const executionResult = (await this.executeFunctions.startJob<T>(
				'javascript',
				{
					code: this.jsCode,
					nodeMode: this.nodeMode,
					workflowMode: this.workflowMode,
				},
				itemIndex,
			)) as T;
			return executionResult;
		} catch (e) {
			const error = ensureError(e);
			throw new ExecutionError(error);
		}
	}

	async runCodeAllItems(): Promise<INodeExecutionData[]> {
		const itemIndex = 0;

		return await this.executeFunctions
			.startJob<INodeExecutionData[]>(
				'javascript',
				{
					code: this.jsCode,
					nodeMode: this.nodeMode,
					workflowMode: this.workflowMode,
					continueOnFail: this.executeFunctions.continueOnFail(),
				},
				itemIndex,
			)
			.catch((e) => {
				const error = ensureError(e);
				// anticipate user expecting `items` to pre-exist as in Function Item node
				mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);

				throw new ExecutionError(error);
			});
	}

	async runCodeForEachItem(): Promise<INodeExecutionData[]> {
		validateNoDisallowedMethodsInRunForEach(this.jsCode, 0);
		const itemIndex = 0;

		return await this.executeFunctions
			.startJob<INodeExecutionData[]>(
				'javascript',
				{
					code: this.jsCode,
					nodeMode: this.nodeMode,
					workflowMode: this.workflowMode,
					continueOnFail: this.executeFunctions.continueOnFail(),
				},
				itemIndex,
			)
			.catch((e) => {
				const error = ensureError(e);
				// anticipate user expecting `items` to pre-exist as in Function Item node
				mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);

				throw new ExecutionError(error);
			});
	}
}

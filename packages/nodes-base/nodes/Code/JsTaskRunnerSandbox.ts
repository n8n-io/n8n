import {
	type CodeExecutionMode,
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { validateNoDisallowedMethodsInRunForEach } from './JsCodeValidator';
import { throwExecutionError } from './throw-execution-error';

/**
 * JS Code execution sandbox that executes the JS code using task runner.
 */
export class JsTaskRunnerSandbox {
	constructor(
		private readonly jsCode: string,
		private readonly nodeMode: CodeExecutionMode,
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: IExecuteFunctions,
		private readonly chunkSize = 1000,
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
			: throwExecutionError('error' in executionResult ? executionResult.error : {});
	}

	async runCodeForEachItem(numInputItems: number): Promise<INodeExecutionData[]> {
		validateNoDisallowedMethodsInRunForEach(this.jsCode, 0);

		const itemIndex = 0;
		const chunks = this.chunkInputItems(numInputItems);
		let executionResults: INodeExecutionData[] = [];

		for (const chunk of chunks) {
			const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
				'javascript',
				{
					code: this.jsCode,
					nodeMode: this.nodeMode,
					workflowMode: this.workflowMode,
					continueOnFail: this.executeFunctions.continueOnFail(),
					chunk: {
						startIndex: chunk.startIdx,
						count: chunk.count,
					},
				},
				itemIndex,
			);

			if (!executionResult.ok) {
				return throwExecutionError('error' in executionResult ? executionResult.error : {});
			}

			executionResults = executionResults.concat(executionResult.result);
		}

		return executionResults;
	}

	/** Chunks the input items into chunks of 1000 items each */
	private chunkInputItems(numInputItems: number) {
		const numChunks = Math.ceil(numInputItems / this.chunkSize);
		const chunks = [];

		for (let i = 0; i < numChunks; i++) {
			const startIdx = i * this.chunkSize;
			const isLastChunk = i === numChunks - 1;
			const count = isLastChunk ? numInputItems - startIdx : this.chunkSize;
			chunks.push({
				startIdx,
				count,
			});
		}

		return chunks;
	}
}

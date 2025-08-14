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
 * Code execution sandbox that executes the JS code using task runner.
 */
export class TaskRunnerSandbox {
	constructor(
		private readonly language: 'javascript' | 'python',
		private readonly code: string,
		private readonly nodeMode: CodeExecutionMode,
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: IExecuteFunctions,
		private readonly chunkSize = 1000,
	) {}

	/**
	 * Run a script by forwarding it to a task runner, together with input items.
	 *
	 * The Python runner receives input items together with the task, whereas the
	 * JavaScript runner does _not_ receive input items together with the task and
	 * instead retrieves them later, only if needed, via an RPC request.
	 */
	async runUsingIncomingItems() {
		return await this.runCodeAllItems({ items: this.executeFunctions.getInputData() });
	}

	async runCodeAllItems(opts?: { items: INodeExecutionData[] }): Promise<INodeExecutionData[]> {
		const itemIndex = 0;

		const taskSettings: Record<string, unknown> = {
			code: this.code,
			nodeMode: this.nodeMode,
			workflowMode: this.workflowMode,
			continueOnFail: this.executeFunctions.continueOnFail(),
		};

		if (opts?.items) taskSettings.items = opts.items;

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			this.language,
			taskSettings,
			itemIndex,
		);

		return executionResult.ok
			? executionResult.result
			: this.throwExecutionError('error' in executionResult ? executionResult.error : {});
	}

	async runCodeForEachItem(numInputItems: number): Promise<INodeExecutionData[]> {
		validateNoDisallowedMethodsInRunForEach(this.code, 0);

		const itemIndex = 0;
		const chunks = this.chunkInputItems(numInputItems);
		let executionResults: INodeExecutionData[] = [];

		for (const chunk of chunks) {
			const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
				this.language,
				{
					code: this.code,
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
				return this.throwExecutionError('error' in executionResult ? executionResult.error : {});
			}

			executionResults = executionResults.concat(executionResult.result);
		}

		return executionResults;
	}

	private throwExecutionError(error: unknown): never {
		if (error instanceof Error) {
			throw error;
		} else if (isWrappableError(error)) {
			// The error coming from task runner is not an instance of error,
			// so we need to wrap it in an error instance.
			throw new WrappedExecutionError(error);
		}

		throw new ApplicationError(`Unknown error: ${JSON.stringify(error)}`);
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

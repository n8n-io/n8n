import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { validateNoDisallowedMethodsInRunForEach } from './JsCodeValidator';
import type { TextKeys } from './result-validation';
import { validateRunCodeAllItems, validateRunCodeEachItem } from './result-validation';
import { throwExecutionError } from './throw-execution-error';

const JS_TEXT_KEYS: TextKeys = {
	object: { singular: 'object', plural: 'objects' },
};

/**
 * JS Code execution sandbox that executes the JS code using task runner.
 */
export class JsTaskRunnerSandbox {
	constructor(
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: Pick<
			IExecuteFunctions,
			'startJob' | 'continueOnFail' | 'helpers'
		>,
		private readonly chunkSize = 1000,
		private readonly additionalProperties: Record<string, unknown> = {},
	) {}

	async runCodeAllItems(code: string): Promise<INodeExecutionData[]> {
		const itemIndex = 0;

		const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
			'javascript',
			{
				code,
				nodeMode: 'runOnceForAllItems',
				workflowMode: this.workflowMode,
				continueOnFail: this.executeFunctions.continueOnFail(),
				additionalProperties: this.additionalProperties,
			},
			itemIndex,
		);

		if (!executionResult.ok) {
			throwExecutionError('error' in executionResult ? executionResult.error : {});
		}

		return validateRunCodeAllItems(
			executionResult.result,
			JS_TEXT_KEYS,
			this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers),
		);
	}

	async runCodeForTool(code: string): Promise<unknown> {
		const itemIndex = 0;

		const executionResult = await this.executeFunctions.startJob(
			'javascript',
			{
				code,
				nodeMode: 'runOnceForAllItems',
				workflowMode: this.workflowMode,
				continueOnFail: this.executeFunctions.continueOnFail(),
				additionalProperties: this.additionalProperties,
			},
			itemIndex,
		);

		if (!executionResult.ok) {
			throwExecutionError('error' in executionResult ? executionResult.error : {});
		}

		return executionResult.result;
	}

	async runCodeForEachItem(code: string, numInputItems: number): Promise<INodeExecutionData[]> {
		validateNoDisallowedMethodsInRunForEach(code, 0);

		const itemIndex = 0;
		const chunks = this.chunkInputItems(numInputItems);
		let executionResults: INodeExecutionData[] = [];

		for (const chunk of chunks) {
			const executionResult = await this.executeFunctions.startJob<INodeExecutionData[]>(
				'javascript',
				{
					code,
					nodeMode: 'runOnceForEachItem',
					workflowMode: this.workflowMode,
					continueOnFail: this.executeFunctions.continueOnFail(),
					chunk: {
						startIndex: chunk.startIdx,
						count: chunk.count,
					},
					additionalProperties: this.additionalProperties,
				},
				itemIndex,
			);

			if (!executionResult.ok) {
				return throwExecutionError('error' in executionResult ? executionResult.error : {});
			}

			for (let i = 0; i < executionResult.result.length; i++) {
				const actualItemIndex = chunk.startIdx + i;
				const validatedItem = validateRunCodeEachItem(
					executionResult.result[i],
					actualItemIndex,
					JS_TEXT_KEYS,
					this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers),
				);
				executionResult.result[i] = validatedItem;
			}

			executionResults = executionResults.concat(executionResult.result);
		}

		return executionResults;
	}

	async runCode<T = unknown>(code: string): Promise<T> {
		const executionResult = await this.executeFunctions.startJob(
			'javascript',
			{
				code,
				nodeMode: 'runCode',
				workflowMode: this.workflowMode,
				continueOnFail: this.executeFunctions.continueOnFail(),
				additionalProperties: this.additionalProperties,
			},
			0,
		);

		if (!executionResult.ok) {
			throwExecutionError('error' in executionResult ? executionResult.error : {});
		}

		// We just assume the caller types the result correctly to match the code
		return executionResult.result as T;
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

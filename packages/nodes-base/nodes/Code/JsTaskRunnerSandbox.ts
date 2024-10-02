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
import { Sandbox } from './Sandbox';
import { ValidationError } from './ValidationError';

function isArrayOfArrays(
	data: INodeExecutionData | INodeExecutionData[] | INodeExecutionData[][],
): data is INodeExecutionData[][] {
	return Array.isArray(data) && data.every((item) => Array.isArray(item));
}

const TEXT_KEYS = {
	object: {
		singular: 'object',
		plural: 'objects',
	},
};

/**
 * JS Code execution sandbox that executes the JS code using task runner.
 */
export class JsTaskRunnerSandbox extends Sandbox {
	constructor(
		private readonly jsCode: string,
		private readonly nodeMode: CodeExecutionMode,
		private readonly workflowMode: WorkflowExecuteMode,
		private readonly executeFunctions: IExecuteFunctions,
	) {
		super(TEXT_KEYS, executeFunctions.helpers);
	}

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

	async runCodeAllItems(options?: {
		multiOutput?: boolean;
	}): Promise<INodeExecutionData[] | INodeExecutionData[][]> {
		const itemIndex = 0;

		const executionResult: INodeExecutionData | INodeExecutionData[] | INodeExecutionData[][] =
			await this.executeFunctions
				.startJob<INodeExecutionData | INodeExecutionData[] | INodeExecutionData[][]>(
					'javascript',
					{
						code: this.jsCode,
						nodeMode: this.nodeMode,
						workflowMode: this.workflowMode,
					},
					itemIndex,
				)
				.catch((e) => {
					const error = ensureError(e);
					// anticipate user expecting `items` to pre-exist as in Function Item node
					mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);

					throw new ExecutionError(error);
				});

		if (executionResult === null) return [];

		if (options?.multiOutput === true) {
			// Check if executionResult is an array of arrays
			if (!isArrayOfArrays(executionResult)) {
				throw new ValidationError({
					message: "The code doesn't return an array of arrays",
					description:
						'Please return an array of arrays. One array for the different outputs and one for the different items that get returned.',
				});
			}

			return executionResult.map((data) => {
				return this.validateRunCodeAllItems(data);
			});
		}

		return this.validateRunCodeAllItems(
			executionResult as INodeExecutionData | INodeExecutionData[],
		);
	}

	async runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined> {
		validateNoDisallowedMethodsInRunForEach(this.jsCode, itemIndex);

		const executionResult: INodeExecutionData = await this.executeFunctions
			.startJob<INodeExecutionData>(
				'javascript',
				{
					code: this.jsCode,
					nodeMode: this.nodeMode,
					workflowMode: this.workflowMode,
				},
				itemIndex,
			)
			.catch((e) => {
				const error = ensureError(e);
				// anticipate user expecting `items` to pre-exist as in Function Item node
				mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);

				throw new ExecutionError(error);
			});

		if (executionResult === null) return undefined;

		return this.validateRunCodeEachItem(executionResult, itemIndex);
	}
}

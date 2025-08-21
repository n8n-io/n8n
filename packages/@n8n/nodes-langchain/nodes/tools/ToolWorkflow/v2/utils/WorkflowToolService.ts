import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import { getCurrentWorkflowInputData } from 'n8n-nodes-base/dist/utils/workflowInputsResourceMapping/GenericFunctions';
import type {
	ExecuteWorkflowData,
	ExecutionError,
	FromAIArgument,
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeParameterResourceLocator,
	ISupplyDataFunctions,
	ITaskMetadata,
	IWorkflowBase,
	IWorkflowDataProxyData,
	ResourceMapperValue,
} from 'n8n-workflow';
import {
	generateZodSchema,
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
	parseErrorMetadata,
	sleepWithAbort,
	traverseNodeParameters,
} from 'n8n-workflow';
import { z } from 'zod';

function isNodeExecutionData(data: unknown): data is INodeExecutionData[] {
	return isArray(data) && Boolean(data.length) && isObject(data[0]) && 'json' in data[0];
}

/**
	Main class for creating the Workflow tool
	Processes the node parameters and creates AI Agent tool capable of executing n8n workflows
*/
export class WorkflowToolService {
	// Determines if we should use input schema when creating the tool
	private useSchema: boolean;

	// Sub-workflow id, pulled from referenced sub-workflow
	private subWorkflowId: string | undefined;

	// Sub-workflow execution id, will be set after the sub-workflow is executed
	private subExecutionId: string | undefined;

	private returnAllItems: boolean = false;

	constructor(
		private baseContext: ISupplyDataFunctions,
		options?: { returnAllItems: boolean },
	) {
		const subWorkflowInputs = this.baseContext.getNode().parameters
			.workflowInputs as ResourceMapperValue;
		this.useSchema = (subWorkflowInputs?.schema ?? []).length > 0;
		this.returnAllItems = options?.returnAllItems ?? false;
	}

	// Creates the tool based on the provided parameters
	async createTool({
		ctx,
		name,
		description,
		itemIndex,
	}: {
		ctx: ISupplyDataFunctions;
		name: string;
		description: string;
		itemIndex: number;
	}): Promise<DynamicTool | DynamicStructuredTool> {
		// Handler for the tool execution, will be called when the tool is executed
		// This function will execute the sub-workflow and return the response
		// We get the runIndex from the context to handle multiple executions
		// of the same tool when the tool is used in a loop or in a parallel execution.
		const node = ctx.getNode();

		let runIndex: number = ctx.getNextRunIndex();
		const toolHandler = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<IDataObject | IDataObject[] | string> => {
			let maxTries = 1;
			if (node.retryOnFail === true) {
				maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
			}

			let waitBetweenTries = 0;
			if (node.retryOnFail === true) {
				waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
			}

			let lastError: ExecutionError | undefined;

			for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
				const localRunIndex = runIndex++;
				// We need to clone the context here to handle runIndex correctly
				// Otherwise the runIndex will be shared between different executions
				// Causing incorrect data to be passed to the sub-workflow and via $fromAI
				const context = this.baseContext.cloneWith({
					runIndex: localRunIndex,
					inputData: [[{ json: { query } }]],
				});

				// Get abort signal from context for cancellation support
				const abortSignal = context.getExecutionCancelSignal?.();

				// Check if execution was cancelled before retry
				if (abortSignal?.aborted) {
					return 'There was an error: "Execution was cancelled"';
				}

				if (tryIndex !== 0) {
					// Reset error from previous attempt
					lastError = undefined;
					if (waitBetweenTries !== 0) {
						try {
							await sleepWithAbort(waitBetweenTries, abortSignal);
						} catch (abortError) {
							return 'There was an error: "Execution was cancelled"';
						}
					}
				}

				try {
					const response = await this.runFunction(context, query, itemIndex, runManager);

					const processedResponse = this.handleToolResponse(response);

					let responseData: INodeExecutionData[];
					if (isNodeExecutionData(response)) {
						responseData = response;
					} else {
						const reParsedData = jsonParse<IDataObject>(processedResponse, {
							fallbackValue: { response: processedResponse },
						});

						responseData = [{ json: reParsedData }];
					}

					// Once the sub-workflow is executed, add the output data to the context
					// This will be used to link the sub-workflow execution in the parent workflow
					let metadata: ITaskMetadata | undefined;
					if (this.subExecutionId && this.subWorkflowId) {
						metadata = {
							subExecution: {
								executionId: this.subExecutionId,
								workflowId: this.subWorkflowId,
							},
						};
					}

					void context.addOutputData(
						NodeConnectionTypes.AiTool,
						localRunIndex,
						[responseData],
						metadata,
					);

					return processedResponse;
				} catch (error) {
					// Check if error is due to cancellation
					if (abortSignal?.aborted) {
						return 'There was an error: "Execution was cancelled"';
					}

					const executionError = error as ExecutionError;
					lastError = executionError;
					const errorResponse = `There was an error: "${executionError.message}"`;

					const metadata = parseErrorMetadata(error);
					void context.addOutputData(
						NodeConnectionTypes.AiTool,
						localRunIndex,
						executionError,
						metadata,
					);

					if (tryIndex === maxTries - 1) {
						return errorResponse;
					}
				}
			}

			return `There was an error: ${lastError?.message ?? 'Unknown error'}`;
		};

		// Create structured tool if input schema is provided
		return this.useSchema
			? await this.createStructuredTool(name, description, toolHandler)
			: new DynamicTool({ name, description, func: toolHandler });
	}

	private handleToolResponse(response: unknown): string {
		if (typeof response === 'number') {
			return response.toString();
		}

		if (isNodeExecutionData(response)) {
			return JSON.stringify(
				response.map((item) => item.json),
				null,
				2,
			);
		}

		if (isObject(response)) {
			return JSON.stringify(response, null, 2);
		}

		if (typeof response !== 'string') {
			throw new NodeOperationError(this.baseContext.getNode(), 'Wrong output type returned', {
				description: `The response property should be a string, but it is an ${typeof response}`,
			});
		}

		return response;
	}

	/**
	 * Executes specified sub-workflow with provided inputs
	 */
	private async executeSubWorkflow(
		context: ISupplyDataFunctions,
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		workflowProxy: IWorkflowDataProxyData,
		runManager?: CallbackManagerForToolRun,
	): Promise<{ response: string | IDataObject | INodeExecutionData[]; subExecutionId: string }> {
		let receivedData: ExecuteWorkflowData;
		try {
			receivedData = await context.executeWorkflow(workflowInfo, items, runManager?.getChild(), {
				parentExecution: {
					executionId: workflowProxy.$execution.id,
					workflowId: workflowProxy.$workflow.id,
				},
			});
			// Set sub-workflow execution id so it can be used in other places
			this.subExecutionId = receivedData.executionId;
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error);
		}

		let response: IDataObject | INodeExecutionData[] | undefined;
		if (this.returnAllItems) {
			response = receivedData?.data?.[0]?.length ? receivedData.data[0] : undefined;
		} else {
			response = receivedData?.data?.[0]?.[0]?.json;
		}
		if (response === undefined) {
			throw new NodeOperationError(
				context.getNode(),
				'There was an error: "The workflow did not return a response"',
			);
		}

		return { response, subExecutionId: receivedData.executionId };
	}

	/**
	 * Gets the sub-workflow info based on the source and executes it.
	 * This function will be called as part of the tool execution (from the toolHandler)
	 */
	private async runFunction(
		context: ISupplyDataFunctions,
		query: string | IDataObject,
		itemIndex: number,
		runManager?: CallbackManagerForToolRun,
	): Promise<string | IDataObject | INodeExecutionData[]> {
		const source = context.getNodeParameter('source', itemIndex) as string;
		const workflowProxy = context.getWorkflowDataProxy(0);

		const { workflowInfo } = await this.getSubWorkflowInfo(
			context,
			source,
			itemIndex,
			workflowProxy,
		);
		const rawData = this.prepareRawData(context, query, itemIndex);
		const items = await this.prepareWorkflowItems(context, query, itemIndex, rawData);

		this.subWorkflowId = workflowInfo.id;

		const { response } = await this.executeSubWorkflow(
			context,
			workflowInfo,
			items,
			workflowProxy,
			runManager,
		);
		return response;
	}

	/**
	 * Gets the sub-workflow info based on the source (database or parameter)
	 */
	private async getSubWorkflowInfo(
		context: ISupplyDataFunctions,
		source: string,
		itemIndex: number,
		workflowProxy: IWorkflowDataProxyData,
	): Promise<{
		workflowInfo: IExecuteWorkflowInfo;
		subWorkflowId: string;
	}> {
		const workflowInfo: IExecuteWorkflowInfo = {};
		let subWorkflowId: string;

		if (source === 'database') {
			const { value } = context.getNodeParameter(
				'workflowId',
				itemIndex,
				{},
			) as INodeParameterResourceLocator;
			workflowInfo.id = value as string;
			subWorkflowId = workflowInfo.id;
		} else if (source === 'parameter') {
			const workflowJson = context.getNodeParameter('workflowJson', itemIndex) as string;
			try {
				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
				// subworkflow is same as parent workflow
				subWorkflowId = workflowProxy.$workflow.id;
			} catch (error) {
				throw new NodeOperationError(
					context.getNode(),
					`The provided workflow is not valid JSON: "${(error as Error).message}"`,
					{ itemIndex },
				);
			}
		}

		return { workflowInfo, subWorkflowId: subWorkflowId! };
	}

	private prepareRawData(
		context: ISupplyDataFunctions,
		query: string | IDataObject,
		itemIndex: number,
	): IDataObject {
		const rawData: IDataObject = { query };
		const workflowFieldsJson = context.getNodeParameter('fields.values', itemIndex, [], {
			rawExpressions: true,
		}) as SetField[];

		// Copied from Set Node v2
		for (const entry of workflowFieldsJson) {
			if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
				rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
			}
		}

		return rawData;
	}

	/**
	 * Prepares the sub-workflow items for execution
	 */
	private async prepareWorkflowItems(
		context: ISupplyDataFunctions,
		query: string | IDataObject,
		itemIndex: number,
		rawData: IDataObject,
	): Promise<INodeExecutionData[]> {
		const options: SetNodeOptions = { include: 'all' };
		let jsonData = typeof query === 'object' ? query : { query };

		if (this.useSchema) {
			const currentWorkflowInputs = getCurrentWorkflowInputData.call(context);
			jsonData = currentWorkflowInputs[itemIndex].json;
		}

		const newItem = await manual.execute.call(
			context,
			{ json: jsonData },
			itemIndex,
			options,
			rawData,
			context.getNode(),
		);

		return [newItem] as INodeExecutionData[];
	}

	/**
	 *  Create structured tool by parsing the sub-workflow input schema
	 */
	private async createStructuredTool(
		name: string,
		description: string,
		func: (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		) => Promise<string | IDataObject | IDataObject[]>,
	): Promise<DynamicStructuredTool | DynamicTool> {
		const collectedArguments = await this.extractFromAIParameters();

		// If there are no `fromAI` arguments, fallback to creating a simple tool
		if (collectedArguments.length === 0) {
			return new DynamicTool({ name, description, func });
		}

		// Otherwise, prepare Zod schema  and create a structured tool
		const schema = this.createZodSchema(collectedArguments);
		return new DynamicStructuredTool({ schema, name, description, func });
	}

	private async extractFromAIParameters(): Promise<FromAIArgument[]> {
		const collectedArguments: FromAIArgument[] = [];
		traverseNodeParameters(this.baseContext.getNode().parameters, collectedArguments);

		const uniqueArgsMap = new Map<string, FromAIArgument>();
		for (const arg of collectedArguments) {
			uniqueArgsMap.set(arg.key, arg);
		}

		return Array.from(uniqueArgsMap.values());
	}

	private createZodSchema(args: FromAIArgument[]): z.ZodObject<any> {
		const schemaObj = args.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
			acc[placeholder.key] = generateZodSchema(placeholder);
			return acc;
		}, {});

		return z.object(schemaObj).required();
	}
}

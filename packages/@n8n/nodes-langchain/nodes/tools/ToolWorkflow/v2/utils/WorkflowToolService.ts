import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import get from 'lodash/get';
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
	NodeConnectionType,
	NodeOperationError,
	parseErrorMetadata,
	traverseNodeParameters,
} from 'n8n-workflow';
import { z } from 'zod';

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

	constructor(private context: ISupplyDataFunctions) {
		const subWorkflowInputs = this.context.getNode().parameters
			.workflowInputs as ResourceMapperValue;
		this.useSchema = (subWorkflowInputs?.schema ?? []).length > 0;
	}

	// Creates the tool based on the provided parameters
	async createTool({
		name,
		description,
		itemIndex,
	}: {
		name: string;
		description: string;
		itemIndex: number;
	}): Promise<DynamicTool | DynamicStructuredTool> {
		// Handler for the tool execution, will be called when the tool is executed
		// This function will execute the sub-workflow and return the response
		const toolHandler = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<string> => {
			const { index } = this.context.addInputData(NodeConnectionType.AiTool, [
				[{ json: { query } }],
			]);

			try {
				const response = await this.runFunction(query, itemIndex, runManager);
				const processedResponse = this.handleToolResponse(response);

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
				const json = jsonParse<IDataObject>(processedResponse, {
					fallbackValue: { response: processedResponse },
				});
				void this.context.addOutputData(NodeConnectionType.AiTool, index, [[{ json }]], metadata);

				return processedResponse;
			} catch (error) {
				const executionError = error as ExecutionError;
				const errorResponse = `There was an error: "${executionError.message}"`;

				const metadata = parseErrorMetadata(error);
				void this.context.addOutputData(NodeConnectionType.AiTool, index, executionError, metadata);
				return errorResponse;
			} finally {
				// @ts-expect-error this accesses a private member on the actual implementation to fix https://linear.app/n8n/issue/ADO-3186/bug-workflowtool-v2-always-uses-first-row-of-input-data
				this.context.runIndex++;
			}
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

		if (isObject(response)) {
			return JSON.stringify(response, null, 2);
		}

		if (typeof response !== 'string') {
			throw new NodeOperationError(this.context.getNode(), 'Wrong output type returned', {
				description: `The response property should be a string, but it is an ${typeof response}`,
			});
		}

		return response;
	}

	/**
	 * Executes specified sub-workflow with provided inputs
	 */
	private async executeSubWorkflow(
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		workflowProxy: IWorkflowDataProxyData,
		runManager?: CallbackManagerForToolRun,
	): Promise<{ response: string; subExecutionId: string }> {
		let receivedData: ExecuteWorkflowData;
		try {
			receivedData = await this.context.executeWorkflow(
				workflowInfo,
				items,
				runManager?.getChild(),
				{
					parentExecution: {
						executionId: workflowProxy.$execution.id,
						workflowId: workflowProxy.$workflow.id,
					},
				},
			);
			// Set sub-workflow execution id so it can be used in other places
			this.subExecutionId = receivedData.executionId;
		} catch (error) {
			throw new NodeOperationError(this.context.getNode(), error as Error);
		}

		const response: string | undefined = get(receivedData, 'data[0][0].json') as string | undefined;
		if (response === undefined) {
			throw new NodeOperationError(
				this.context.getNode(),
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
		query: string | IDataObject,
		itemIndex: number,
		runManager?: CallbackManagerForToolRun,
	): Promise<string> {
		const source = this.context.getNodeParameter('source', itemIndex) as string;
		const workflowProxy = this.context.getWorkflowDataProxy(0);

		const { workflowInfo } = await this.getSubWorkflowInfo(source, itemIndex, workflowProxy);
		const rawData = this.prepareRawData(query, itemIndex);
		const items = await this.prepareWorkflowItems(query, itemIndex, rawData);

		this.subWorkflowId = workflowInfo.id;

		const { response } = await this.executeSubWorkflow(
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
			const { value } = this.context.getNodeParameter(
				'workflowId',
				itemIndex,
				{},
			) as INodeParameterResourceLocator;
			workflowInfo.id = value as string;
			subWorkflowId = workflowInfo.id;
		} else if (source === 'parameter') {
			const workflowJson = this.context.getNodeParameter('workflowJson', itemIndex) as string;
			try {
				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
				// subworkflow is same as parent workflow
				subWorkflowId = workflowProxy.$workflow.id;
			} catch (error) {
				throw new NodeOperationError(
					this.context.getNode(),
					`The provided workflow is not valid JSON: "${(error as Error).message}"`,
					{ itemIndex },
				);
			}
		}

		return { workflowInfo, subWorkflowId: subWorkflowId! };
	}

	private prepareRawData(query: string | IDataObject, itemIndex: number): IDataObject {
		const rawData: IDataObject = { query };
		const workflowFieldsJson = this.context.getNodeParameter('fields.values', itemIndex, [], {
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
		query: string | IDataObject,
		itemIndex: number,
		rawData: IDataObject,
	): Promise<INodeExecutionData[]> {
		const options: SetNodeOptions = { include: 'all' };
		let jsonData = typeof query === 'object' ? query : { query };

		if (this.useSchema) {
			const currentWorkflowInputs = getCurrentWorkflowInputData.call(this.context);
			jsonData = currentWorkflowInputs[itemIndex].json;
		}

		const newItem = await manual.execute.call(
			this.context,
			{ json: jsonData },
			itemIndex,
			options,
			rawData,
			this.context.getNode(),
		);

		return [newItem] as INodeExecutionData[];
	}

	/**
	 *  Create structured tool by parsing the sub-workflow input schema
	 */
	private async createStructuredTool(
		name: string,
		description: string,
		func: (query: string | IDataObject, runManager?: CallbackManagerForToolRun) => Promise<string>,
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
		traverseNodeParameters(this.context.getNode().parameters, collectedArguments);

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

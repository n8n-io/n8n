import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import type {
	ExecuteWorkflowData,
	ExecutionError,
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeParameterResourceLocator,
	ISupplyDataFunctions,
	ITaskMetadata,
	IWorkflowBase,
	IWorkflowDataProxyData,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import type { FromAIArgument } from '../FromAIParser';
import { AIParametersParser } from '../FromAIParser';
import { getCurrentWorkflowInputData } from '../methods/resourceMapping';

// TODO: Add comments, rename to something more descriptive, merge some methods together
export class SupplyDataService {
	constructor(private context: ISupplyDataFunctions) {}

	public getSubworkflowInputsSchema(): ResourceMapperField[] {
		const inputs = this.context.getNode().parameters.workflowInputs as ResourceMapperValue;
		return inputs?.schema ?? [];
	}

	public async createTool({
		name,
		description,
		itemIndex,
		useSchema,
		workflowProxy,
	}: {
		name: string;
		description: string;
		itemIndex: number;
		useSchema: boolean;
		workflowProxy: IWorkflowDataProxyData;
	}): Promise<DynamicTool | DynamicStructuredTool> {
		const toolHandler = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<string> => {
			const { index } = this.context.addInputData(NodeConnectionType.AiTool, [
				[{ json: { query } }],
			]);

			try {
				const response = await this.runFunction(query, itemIndex, runManager, useSchema);
				const processedResponse = this.handleToolResponse(response);

				const metadata = await this.createMetadata(workflowProxy);
				const json = jsonParse<IDataObject>(processedResponse, {
					fallbackValue: { response: processedResponse },
				});
				void this.context.addOutputData(NodeConnectionType.AiTool, index, [[{ json }]], metadata);

				return processedResponse;
			} catch (error) {
				const executionError = error as ExecutionError;
				const errorResponse = `There was an error: "${executionError.message}"`;
				void this.context.addOutputData(NodeConnectionType.AiTool, index, executionError);
				return errorResponse;
			}
		};

		return useSchema
			? await this.createStructuredTool(name, description, toolHandler)
			: new DynamicTool({ name, description, func: toolHandler });
	}

	private async getWorkflowInfo(
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

	private async processWorkflowExecution(
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		runManager: any,
		workflowProxy: any,
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

	private async runFunction(
		query: string | IDataObject,
		itemIndex: number,
		runManager?: CallbackManagerForToolRun,
		useSchema = false,
	): Promise<string> {
		const source = this.context.getNodeParameter('source', itemIndex) as string;
		const workflowProxy = this.context.getWorkflowDataProxy(0);

		const { workflowInfo } = await this.getWorkflowInfo(source, itemIndex, workflowProxy);
		const rawData = this.prepareRawData(query, itemIndex);
		const items = await this.prepareWorkflowItems(query, useSchema, itemIndex, rawData);

		const { response } = await this.processWorkflowExecution(
			workflowInfo,
			items,
			runManager,
			workflowProxy,
		);
		return response;
	}

	private prepareRawData(query: string | IDataObject, itemIndex: number): IDataObject {
		const rawData: IDataObject = { query };
		const workflowFieldsJson = this.context.getNodeParameter('fields.values', itemIndex, [], {
			rawExpressions: true,
		}) as SetField[];

		for (const entry of workflowFieldsJson) {
			if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
				rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
			}
		}

		return rawData;
	}

	private async prepareWorkflowItems(
		query: string | IDataObject,
		useSchema: boolean,
		itemIndex: number,
		rawData: IDataObject,
	): Promise<INodeExecutionData[]> {
		const options: SetNodeOptions = { include: 'all' };
		let jsonData = typeof query === 'object' ? query : { query };

		if (useSchema) {
			const currentWorkflowInputs = getCurrentWorkflowInputData.call(this.context);
			jsonData = currentWorkflowInputs[0].json;
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

	private async createStructuredTool(
		name: string,
		description: string,
		func: (query: string | IDataObject, runManager?: CallbackManagerForToolRun) => Promise<string>,
	): Promise<DynamicStructuredTool | DynamicTool> {
		const fromAIParser = new AIParametersParser(this.context);
		const collectedArguments = await this.collectAndValidateArguments(fromAIParser);

		if (collectedArguments.length === 0) {
			return new DynamicTool({ name, description, func });
		}

		const schema = this.createZodSchema(collectedArguments, fromAIParser);
		return new DynamicStructuredTool({ schema, name, description, func });
	}

	private async collectAndValidateArguments(
		fromAIParser: AIParametersParser,
	): Promise<FromAIArgument[]> {
		const collectedArguments: FromAIArgument[] = [];
		fromAIParser.traverseNodeParameters(this.context.getNode().parameters, collectedArguments);

		const uniqueArgsMap = new Map<string, FromAIArgument>();
		for (const arg of collectedArguments) {
			uniqueArgsMap.set(arg.key, arg);
		}

		return Array.from(uniqueArgsMap.values());
	}

	private createZodSchema(args: FromAIArgument[], parser: AIParametersParser): z.ZodObject<any> {
		const schemaObj = args.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
			acc[placeholder.key] = parser.generateZodSchema(placeholder);
			return acc;
		}, {});

		return z.object(schemaObj).required();
	}

	private async createMetadata(workflowProxy: any): Promise<ITaskMetadata | undefined> {
		const subExecutionId = workflowProxy.$execution.id;
		const subWorkflowId = workflowProxy.$workflow.id;

		if (subExecutionId && subWorkflowId) {
			return {
				subExecution: {
					executionId: subExecutionId,
					workflowId: subWorkflowId,
				},
			};
		}

		return undefined;
	}
}

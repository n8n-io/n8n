import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { JSONSchema7 } from 'json-schema';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import type {
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
	ISupplyDataFunctions,
	SupplyData,
	ExecutionError,
	ExecuteWorkflowData,
	IDataObject,
	INodeParameterResourceLocator,
	ITaskMetadata,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, jsonParse } from 'n8n-workflow';

import { versionDescription } from './versionDescription';
import type { DynamicZodObject } from '../../../../types/zod.types';
import { convertJsonSchemaToZod, generateSchemaFromExample } from '../../../../utils/schemaParsing';

export class ToolWorkflowV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const workflowProxy = this.getWorkflowDataProxy(0);

		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;

		let subExecutionId: string | undefined;
		let subWorkflowId: string | undefined;

		const useSchema = this.getNodeParameter('specifyInputSchema', itemIndex) as boolean;
		let tool: DynamicTool | DynamicStructuredTool | undefined = undefined;

		const runFunction = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<string> => {
			const source = this.getNodeParameter('source', itemIndex) as string;
			const workflowInfo: IExecuteWorkflowInfo = {};
			if (source === 'database') {
				// Read workflow from database
				const nodeVersion = this.getNode().typeVersion;
				if (nodeVersion <= 1.1) {
					workflowInfo.id = this.getNodeParameter('workflowId', itemIndex) as string;
				} else {
					const { value } = this.getNodeParameter(
						'workflowId',
						itemIndex,
						{},
					) as INodeParameterResourceLocator;
					workflowInfo.id = value as string;
				}

				subWorkflowId = workflowInfo.id;
			} else if (source === 'parameter') {
				// Read workflow from parameter
				const workflowJson = this.getNodeParameter('workflowJson', itemIndex) as string;
				try {
					workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;

					// subworkflow is same as parent workflow
					subWorkflowId = workflowProxy.$workflow.id;
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`The provided workflow is not valid JSON: "${(error as Error).message}"`,
						{
							itemIndex,
						},
					);
				}
			}

			const rawData: IDataObject = { query };

			const workflowFieldsJson = this.getNodeParameter('fields.values', itemIndex, [], {
				rawExpressions: true,
			}) as SetField[];

			// Copied from Set Node v2
			for (const entry of workflowFieldsJson) {
				if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
					rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
				}
			}

			const options: SetNodeOptions = {
				include: 'all',
			};

			const newItem = await manual.execute.call(
				this,
				{ json: { query } },
				itemIndex,
				options,
				rawData,
				this.getNode(),
			);

			const items = [newItem] as INodeExecutionData[];

			let receivedData: ExecuteWorkflowData;
			try {
				receivedData = await this.executeWorkflow(workflowInfo, items, runManager?.getChild(), {
					parentExecution: {
						executionId: workflowProxy.$execution.id,
						workflowId: workflowProxy.$workflow.id,
					},
				});
				subExecutionId = receivedData.executionId;
			} catch (error) {
				// Make sure a valid error gets returned that can by json-serialized else it will
				// not show up in the frontend
				throw new NodeOperationError(this.getNode(), error as Error);
			}

			const response: string | undefined = get(receivedData, 'data[0][0].json') as
				| string
				| undefined;
			if (response === undefined) {
				throw new NodeOperationError(
					this.getNode(),
					'There was an error: "The workflow did not return a response"',
				);
			}

			return response;
		};

		const toolHandler = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<string> => {
			const { index } = this.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query } }]]);

			let response: string = '';
			let executionError: ExecutionError | undefined;
			try {
				response = await runFunction(query, runManager);
			} catch (error) {
				// TODO: Do some more testing. Issues here should actually fail the workflow
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				executionError = error;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				response = `There was an error: "${error.message}"`;
			}

			if (typeof response === 'number') {
				response = (response as number).toString();
			}

			if (isObject(response)) {
				response = JSON.stringify(response, null, 2);
			}

			if (typeof response !== 'string') {
				// TODO: Do some more testing. Issues here should actually fail the workflow
				executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
					description: `The response property should be a string, but it is an ${typeof response}`,
				});
				response = `There was an error: "${executionError.message}"`;
			}

			let metadata: ITaskMetadata | undefined;
			if (subExecutionId && subWorkflowId) {
				metadata = {
					subExecution: {
						executionId: subExecutionId,
						workflowId: subWorkflowId,
					},
				};
			}

			if (executionError) {
				void this.addOutputData(NodeConnectionTypes.AiTool, index, executionError, metadata);
			} else {
				// Output always needs to be an object
				// so we try to parse the response as JSON and if it fails we just return the string wrapped in an object
				const json = jsonParse<IDataObject>(response, { fallbackValue: { response } });
				void this.addOutputData(NodeConnectionTypes.AiTool, index, [[{ json }]], metadata);
			}
			return response;
		};

		const functionBase = {
			name,
			description,
			func: toolHandler,
		};

		if (useSchema) {
			try {
				// We initialize these even though one of them will always be empty
				// it makes it easier to navigate the ternary operator
				const jsonExample = this.getNodeParameter('jsonSchemaExample', itemIndex, '') as string;
				const inputSchema = this.getNodeParameter('inputSchema', itemIndex, '') as string;

				const schemaType = this.getNodeParameter('schemaType', itemIndex) as 'fromJson' | 'manual';
				const jsonSchema =
					schemaType === 'fromJson'
						? generateSchemaFromExample(jsonExample)
						: jsonParse<JSONSchema7>(inputSchema);

				const zodSchema = convertJsonSchemaToZod<DynamicZodObject>(jsonSchema);

				tool = new DynamicStructuredTool({
					schema: zodSchema,
					...functionBase,
				});
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Error during parsing of JSON Schema. \n ' + error,
				);
			}
		} else {
			tool = new DynamicTool(functionBase);
		}

		return {
			response: tool,
		};
	}
}

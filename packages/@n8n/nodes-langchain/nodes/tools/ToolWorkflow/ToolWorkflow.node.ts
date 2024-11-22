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
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonParse } from 'n8n-workflow';

import type { DynamicZodObject } from '../../../types/zod.types';
import {
	jsonSchemaExampleField,
	schemaTypeField,
	inputSchemaField,
} from '../../../utils/descriptions';
import { convertJsonSchemaToZod, generateSchema } from '../../../utils/schemaParsing';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class ToolWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Call n8n Workflow Tool',
		name: 'toolWorkflow',
		icon: 'fa:network-wired',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.',
		defaults: {
			name: 'Call n8n Workflow Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName:
					'See an example of a workflow to suggest meeting slots using AI <a href="/templates/1953" target="_blank">here</a>.',
				name: 'noticeTemplateExample',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My_Color_Tool',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. My_Color_Tool',
				validateType: 'string-alphanumeric',
				description:
					'The name of the function to be called, could contain letters, numbers, and underscores only',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder:
					'Call this tool to get a random color. The input should be a string with comma separted names of colors to exclude.',
				typeOptions: {
					rows: 3,
				},
			},

			{
				displayName:
					'This tool will call the workflow you define below, and look in the last node for the response. The workflow needs to start with an Execute Workflow trigger',
				name: 'executeNotice',
				type: 'notice',
				default: '',
			},

			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Database',
						value: 'database',
						description: 'Load the workflow from the database by ID',
					},
					{
						name: 'Define Below',
						value: 'parameter',
						description: 'Pass the JSON code of a workflow',
					},
				],
				default: 'database',
				description: 'Where to get the workflow to execute from',
			},

			// ----------------------------------
			//         source:database
			// ----------------------------------
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
				default: '',
				required: true,
				description: 'The workflow to execute',
				hint: 'Can be found in the URL of the workflow',
			},

			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'workflowSelector',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
				default: '',
				required: true,
			},

			// ----------------------------------
			//         source:parameter
			// ----------------------------------
			{
				displayName: 'Workflow JSON',
				name: 'workflowJson',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						source: ['parameter'],
					},
				},
				default: '\n\n\n\n\n\n\n\n\n',
				required: true,
				description: 'The workflow JSON code to execute',
			},
			// ----------------------------------
			//         For all
			// ----------------------------------
			{
				displayName: 'Field to Return',
				name: 'responsePropertyName',
				type: 'string',
				default: 'response',
				required: true,
				hint: 'The field in the last-executed node of the workflow that contains the response',
				description:
					'Where to find the data that this tool should return. n8n will look in the output of the last-executed node of the workflow for a field with this name, and return its value.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.3 } }],
					},
				},
			},
			{
				displayName: 'Extra Workflow Inputs',
				name: 'fields',
				placeholder: 'Add Value',
				type: 'fixedCollection',
				description:
					"These will be output by the 'execute workflow' trigger of the workflow being called",
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. fieldName',
								description:
									'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.',
								requiresDataPath: 'single',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The field value type',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: 'String',
										value: 'stringValue',
									},
									{
										name: 'Number',
										value: 'numberValue',
									},
									{
										name: 'Boolean',
										value: 'booleanValue',
									},
									{
										name: 'Array',
										value: 'arrayValue',
									},
									{
										name: 'Object',
										value: 'objectValue',
									},
								],
								default: 'stringValue',
							},
							{
								displayName: 'Value',
								name: 'stringValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['stringValue'],
									},
								},
								validateType: 'string',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'numberValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['numberValue'],
									},
								},
								validateType: 'number',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'booleanValue',
								type: 'options',
								default: 'true',
								options: [
									{
										name: 'True',
										value: 'true',
									},
									{
										name: 'False',
										value: 'false',
									},
								],
								displayOptions: {
									show: {
										type: ['booleanValue'],
									},
								},
								validateType: 'boolean',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'arrayValue',
								type: 'string',
								default: '',
								placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
								displayOptions: {
									show: {
										type: ['arrayValue'],
									},
								},
								validateType: 'array',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'objectValue',
								type: 'json',
								default: '={}',
								typeOptions: {
									rows: 2,
								},
								displayOptions: {
									show: {
										type: ['objectValue'],
									},
								},
								validateType: 'object',
								ignoreValidationDuringExecution: true,
							},
						],
					},
				],
			},
			// ----------------------------------
			//         Output Parsing
			// ----------------------------------
			{
				displayName: 'Specify Input Schema',
				name: 'specifyInputSchema',
				type: 'boolean',
				description:
					'Whether to specify the schema for the function. This would require the LLM to provide the input in the correct format and would validate it against the schema.',
				noDataExpression: true,
				default: false,
			},
			{ ...schemaTypeField, displayOptions: { show: { specifyInputSchema: [true] } } },
			jsonSchemaExampleField,
			inputSchemaField,
		],
	};

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
			const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

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
				void this.addOutputData(NodeConnectionType.AiTool, index, executionError, metadata);
			} else {
				// Output always needs to be an object
				// so we try to parse the response as JSON and if it fails we just return the string wrapped in an object
				const json = jsonParse<IDataObject>(response, { fallbackValue: { response } });
				void this.addOutputData(NodeConnectionType.AiTool, index, [[{ json }]], metadata);
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
						? generateSchema(jsonExample)
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

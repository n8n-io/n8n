/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	IWorkflowBase,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import { BaseRetriever, type BaseRetrieverInput } from 'langchain/schema/retriever';
import { Document } from 'langchain/document';

import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import { logWrapper } from '../../../utils/logWrapper';

function objectToString(obj: Record<string, string> | IDataObject, level = 0) {
	let result = '';
	for (const key in obj) {
		const value = obj[key];
		if (typeof value === 'object' && value !== null) {
			result += `${'  '.repeat(level)}- "${key}":\n${objectToString(
				value as IDataObject,
				level + 1,
			)}`;
		} else {
			result += `${'  '.repeat(level)}- "${key}": "${value}"\n`;
		}
	}
	return result;
}

export class RetrieverWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workflow Retriever',
		name: 'retrieverWorkflow',
		icon: 'fa:box-open',
		group: ['transform'],
		version: 1,
		description: 'Use an n8n Workflow as Retriever',
		defaults: {
			name: 'Workflow Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrieverworkflow/',
					},
				],
			},
		},
		inputs: [],
		outputs: [
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionType.AiRetriever,
			},
		],
		properties: [
			{
				displayName:
					'The workflow will receive "query" as input and the output of the last node will be returned and converted to Documents',
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
						name: 'Parameter',
						value: 'parameter',
						description: 'Load the workflow from a parameter',
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
					},
				},
				default: '',
				required: true,
				description: 'The workflow to execute',
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
				default: '\n\n\n',
				required: true,
				description: 'The workflow JSON code to execute',
			},

			// ----------------------------------
			//         For all
			// ----------------------------------
			{
				displayName: 'Workflow Values',
				name: 'fields',
				placeholder: 'Add Value',
				type: 'fixedCollection',
				description: 'Set the values which should be made available in the workflow',
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
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		class WorkflowRetriever extends BaseRetriever {
			lc_namespace = ['n8n-nodes-langchain', 'retrievers', 'workflow'];

			executeFunctions: IExecuteFunctions;

			constructor(executeFunctions: IExecuteFunctions, fields: BaseRetrieverInput) {
				super(fields);
				this.executeFunctions = executeFunctions;
			}

			async getRelevantDocuments(query: string): Promise<Document[]> {
				const source = this.executeFunctions.getNodeParameter('source', itemIndex) as string;

				const baseMetadata: IDataObject = {
					source: 'workflow',
					workflowSource: source,
				};

				const workflowInfo: IExecuteWorkflowInfo = {};
				if (source === 'database') {
					// Read workflow from database
					workflowInfo.id = this.executeFunctions.getNodeParameter(
						'workflowId',
						itemIndex,
					) as string;
					baseMetadata.workflowId = workflowInfo.id;
				} else if (source === 'parameter') {
					// Read workflow from parameter
					const workflowJson = this.executeFunctions.getNodeParameter(
						'workflowJson',
						itemIndex,
					) as string;
					try {
						workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
					} catch (error) {
						throw new NodeOperationError(
							this.executeFunctions.getNode(),
							`The provided workflow is not valid JSON: "${(error as Error).message}"`,
							{
								itemIndex,
							},
						);
					}
				}

				const rawData: IDataObject = { query };

				const workflowFieldsJson = this.executeFunctions.getNodeParameter(
					'fields.values',
					itemIndex,
					[],
					{
						rawExpressions: true,
					},
				) as SetField[];

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
					this.executeFunctions,
					{ json: { query } },
					itemIndex,
					options,
					rawData,
					this.executeFunctions.getNode(),
				);

				const items = [newItem] as INodeExecutionData[];

				let receivedItems: INodeExecutionData[][];
				try {
					receivedItems = (await this.executeFunctions.executeWorkflow(
						workflowInfo,
						items,
					)) as INodeExecutionData[][];
				} catch (error) {
					// Make sure a valid error gets returned that can by json-serialized else it will
					// not show up in the frontend
					throw new NodeOperationError(this.executeFunctions.getNode(), error as Error);
				}

				const returnData: Document[] = [];
				for (const [index, itemData] of receivedItems[0].entries()) {
					const pageContent = objectToString(itemData.json);
					returnData.push(
						new Document({
							pageContent: `### ${index + 1}. Context data:\n${pageContent}`,
							metadata: {
								...baseMetadata,
								itemIndex: index,
							},
						}),
					);
				}

				return returnData;
			}
		}

		const retriever = new WorkflowRetriever(this, {});

		return {
			response: logWrapper(retriever, this),
		};
	}
}

import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { Document } from '@langchain/core/documents';
import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	IWorkflowBase,
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	INodeParameterResourceLocator,
	ExecuteWorkflowData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

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
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
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
				type: NodeConnectionTypes.AiRetriever,
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
						'@version': [{ _cnd: { eq: 1 } }],
					},
				},
				default: '',
				required: true,
				description: 'The workflow to execute',
			},
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'workflowSelector',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.1 } }],
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const workflowProxy = this.getWorkflowDataProxy(0);

		class WorkflowRetriever extends BaseRetriever {
			lc_namespace = ['n8n-nodes-langchain', 'retrievers', 'workflow'];

			constructor(
				private executeFunctions: ISupplyDataFunctions,
				fields: BaseRetrieverInput,
			) {
				super(fields);
			}

			async _getRelevantDocuments(
				query: string,
				config?: CallbackManagerForRetrieverRun,
			): Promise<Document[]> {
				const source = this.executeFunctions.getNodeParameter('source', itemIndex) as string;

				const baseMetadata: IDataObject = {
					source: 'workflow',
					workflowSource: source,
				};

				const workflowInfo: IExecuteWorkflowInfo = {};
				if (source === 'database') {
					const nodeVersion = this.executeFunctions.getNode().typeVersion;
					if (nodeVersion === 1) {
						workflowInfo.id = this.executeFunctions.getNodeParameter(
							'workflowId',
							itemIndex,
						) as string;
					} else {
						const { value } = this.executeFunctions.getNodeParameter(
							'workflowId',
							itemIndex,
							{},
						) as INodeParameterResourceLocator;
						workflowInfo.id = value as string;
					}

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

					// same as current workflow
					baseMetadata.workflowId = workflowProxy.$workflow.id;
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

				let receivedData: ExecuteWorkflowData;
				try {
					receivedData = await this.executeFunctions.executeWorkflow(
						workflowInfo,
						items,
						config?.getChild(),
						{
							parentExecution: {
								executionId: workflowProxy.$execution.id,
								workflowId: workflowProxy.$workflow.id,
							},
						},
					);
				} catch (error) {
					// Make sure a valid error gets returned that can by json-serialized else it will
					// not show up in the frontend
					throw new NodeOperationError(this.executeFunctions.getNode(), error as Error);
				}

				const receivedItems = receivedData.data?.[0] ?? [];

				const returnData: Document[] = [];
				for (const [index, itemData] of receivedItems.entries()) {
					const pageContent = objectToString(itemData.json);
					returnData.push(
						new Document({
							pageContent: `### ${index + 1}. Context data:\n${pageContent}`,
							metadata: {
								...baseMetadata,
								itemIndex: index,
								executionId: receivedData.executionId,
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

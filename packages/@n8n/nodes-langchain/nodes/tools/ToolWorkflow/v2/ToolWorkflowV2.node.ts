import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import type { SetField, SetNodeOptions } from 'n8n-nodes-base/dist/nodes/Set/v2/helpers/interfaces';
import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';
import { getWorkflowInputData } from 'n8n-nodes-base/dist/utils/workflowInputsResourceMapping/GenericFunctions';
import type {
	ExecuteWorkflowData,
	ExecutionError,
	FieldValueOption,
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	ITaskMetadata,
	IWorkflowBase,
	ResourceMapperField,
	ResourceMapperValue,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import type { FromAIArgument } from './FromAIParser';
import { AIParametersParser } from './FromAIParser';
import { loadWorkflowInputMappings } from './methods/resourceMapping';
import { getConnectionHintNoticeField } from '../../../../utils/sharedFields';

function getWorkflowInputValues(this: ISupplyDataFunctions) {
	const inputData = this.getInputData();

	return inputData.map((item, itemIndex) => {
		const itemFieldValues = this.getNodeParameter(
			'workflowInputs.value',
			itemIndex,
			{},
		) as IDataObject;

		return {
			json: {
				...item.json,
				...itemFieldValues,
			},
			index: itemIndex,
			pairedItem: {
				item: itemIndex,
			},
		};
	});
}

function getCurrentWorkflowInputData(this: ISupplyDataFunctions) {
	const inputData = getWorkflowInputValues.call(this);

	const schema = this.getNodeParameter('workflowInputs.schema', 0, []) as ResourceMapperField[];

	if (schema.length === 0) {
		return inputData;
	} else {
		const newParams = schema
			.filter((x) => !x.removed)
			.map((x) => ({ name: x.displayName, type: x.type ?? 'any' })) as FieldValueOption[];

		return getWorkflowInputData.call(this, inputData, newParams);
	}
}

export class ToolWorkflowV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2],
			defaults: {
				name: 'Call n8n Workflow Tool',
			},
			inputs: [],
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
				// -----------------------------------------------
				//         Resource mapper for workflow inputs
				// -----------------------------------------------
				{
					displayName: 'Workflow Inputs',
					name: 'workflowInputs',
					type: 'resourceMapper',
					noDataExpression: true,
					default: {
						mappingMode: 'defineBelow',
						value: null,
					},
					required: true,
					typeOptions: {
						loadOptionsDependsOn: ['workflowId.value'],
						resourceMapper: {
							localResourceMapperMethod: 'loadWorkflowInputMappings',
							valuesLabel: 'Workflow Inputs',
							mode: 'map',
							fieldWords: {
								singular: 'workflow input',
								plural: 'workflow inputs',
							},
							addAllFields: true,
							multiKeyMatch: false,
							supportAutoMap: false,
						},
					},
					displayOptions: {
						show: {
							source: ['database'],
						},
						hide: {
							workflowId: [''],
						},
					},
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
			],
		};
	}

	methods = {
		localResourceMapping: {
			loadWorkflowInputMappings,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;
		const workflowProxy = this.getWorkflowDataProxy(0);

		const subworkflowInputsSchema =
			(this.getNode().parameters.workflowInputs as ResourceMapperValue)?.schema ?? [];
		const useSchema = subworkflowInputsSchema.length > 0;
		let tool: DynamicTool | DynamicStructuredTool | undefined = undefined;

		let subExecutionId: string | undefined;
		let subWorkflowId: string | undefined;

		const runFunction = async (
			query: string | IDataObject,
			runManager?: CallbackManagerForToolRun,
		): Promise<string> => {
			const source = this.getNodeParameter('source', itemIndex) as string;
			const workflowInfo: IExecuteWorkflowInfo = {};
			if (source === 'database') {
				// Read workflow from database
				const { value } = this.getNodeParameter(
					'workflowId',
					itemIndex,
					{},
				) as INodeParameterResourceLocator;
				workflowInfo.id = value as string;

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

			let items = [] as INodeExecutionData[];

			let jsonData = typeof query === 'object' ? query : { query };
			if (useSchema) {
				const currentWorkflowInputs = getCurrentWorkflowInputData.call(this);
				// TODO: Pull in master and not use 0 index here
				jsonData = currentWorkflowInputs[0].json;
			}

			const newItem = await manual.execute.call(
				this,
				{ json: jsonData },
				itemIndex,
				options,
				rawData,
				this.getNode(),
			);

			items = [newItem] as INodeExecutionData[];

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
				const fromAIParser = new AIParametersParser(this);
				const collectedArguments: FromAIArgument[] = [];
				fromAIParser.traverseNodeParameters(this.getNode().parameters, collectedArguments);
				// Validate each collected argument
				const keyMap = new Map<string, FromAIArgument>();
				for (const argument of collectedArguments) {
					if (keyMap.has(argument.key)) {
						// If the key already exists in the Map
						const existingArg = keyMap.get(argument.key);
						if (!existingArg) {
							throw new NodeOperationError(
								this.getNode(),
								`Argument with key '${argument.key}' not found in keyMap`,
							);
						}

						// Check if the existing argument has the same description and type
						if (
							!existingArg ||
							(existingArg.description === argument.description &&
								existingArg.type === argument.type)
						) {
							keyMap.set(argument.key, argument);
						}
					}
				}

				// Remove duplicate keys, latest occurrence takes precedence
				const uniqueArgsMap = collectedArguments.reduce((map, arg) => {
					map.set(arg.key, arg);
					return map;
				}, new Map<string, FromAIArgument>());

				const uniqueArguments = Array.from(uniqueArgsMap.values());

				if (uniqueArguments.length === 0) {
					tool = new DynamicTool({
						...functionBase,
					});
				} else {
					// Generate Zod schema from unique arguments
					const schemaObj = uniqueArguments.reduce(
						(acc: Record<string, z.ZodTypeAny>, placeholder) => {
							acc[placeholder.key] = fromAIParser.generateZodSchema(placeholder);
							return acc;
						},
						{},
					);

					const schema = z.object(schemaObj).required();
					tool = new DynamicStructuredTool({
						schema,
						...functionBase,
					});
				}
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

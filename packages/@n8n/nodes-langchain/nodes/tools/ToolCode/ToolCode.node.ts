/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { JSONSchema7 } from 'json-schema';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';
import type { Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	ExecutionError,
	IDataObject,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	buildInputSchemaField,
	buildJsonSchemaExampleField,
	schemaTypeField,
} from '@utils/descriptions';
import { nodeNameToToolName } from '@utils/helpers';
import { convertJsonSchemaToZod, generateSchema } from '@utils/schemaParsing';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import type { DynamicZodObject } from '../../../types/zod.types';

export class ToolCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code Tool',
		name: 'toolCode',
		icon: 'fa:code',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Write a tool in JS or Python',
		defaults: {
			name: 'Code Tool',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'See an example of a conversational agent with custom tool written in JavaScript <a href="/templates/1963" target="_blank">here</a>.',
				name: 'noticeTemplateExample',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My_Tool',
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
				placeholder: 'e.g. My_Tool',
				validateType: 'string-alphanumeric',
				description:
					'The name of the function to be called, could contain letters, numbers, and underscores only',
				displayOptions: {
					show: {
						'@version': [1.1],
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
				displayName: 'Language',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
					},
					{
						name: 'Python (Beta)',
						value: 'python',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'JavaScript',
				name: 'jsCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['javaScript'],
					},
				},
				typeOptions: {
					editor: 'jsEditor',
				},
				default:
					'// Example: convert the incoming query to uppercase and return it\nreturn query.toUpperCase()',
				// TODO: Add proper text here later
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: 'E.g. Converts any text to uppercase',
				noDataExpression: true,
			},
			{
				displayName: 'Python',
				name: 'pythonCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['python'],
					},
				},
				typeOptions: {
					editor: 'codeNodeEditor', // TODO: create a separate `pythonEditor` component
					editorLanguage: 'python',
				},
				default:
					'# Example: convert the incoming query to uppercase and return it\nreturn query.upper()',
				// TODO: Add proper text here later
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: 'E.g. Converts any text to uppercase',
				noDataExpression: true,
			},
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
			buildJsonSchemaExampleField({ showExtraProps: { specifyInputSchema: [true] } }),
			buildInputSchemaField({ showExtraProps: { specifyInputSchema: [true] } }),
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const workflowMode = this.getMode();

		const { typeVersion } = node;
		const name =
			typeVersion <= 1.1
				? (this.getNodeParameter('name', itemIndex) as string)
				: nodeNameToToolName(node);

		const description = this.getNodeParameter('description', itemIndex) as string;

		const useSchema = this.getNodeParameter('specifyInputSchema', itemIndex) as boolean;

		const language = this.getNodeParameter('language', itemIndex) as string;
		let code = '';
		if (language === 'javaScript') {
			code = this.getNodeParameter('jsCode', itemIndex) as string;
		} else {
			code = this.getNodeParameter('pythonCode', itemIndex) as string;
		}

		const getSandbox = (query: string | IDataObject, index = 0) => {
			const context = getSandboxContext.call(this, index);
			context.query = query;

			let sandbox: Sandbox;
			if (language === 'javaScript') {
				sandbox = new JavaScriptSandbox(context, code, this.helpers);
			} else {
				sandbox = new PythonSandbox(context, code, this.helpers);
			}

			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI.bind(this)
					: (...args: unknown[]) =>
							console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args),
			);
			return sandbox;
		};

		const runFunction = async (query: string | IDataObject): Promise<string> => {
			const sandbox = getSandbox(query, itemIndex);
			return await sandbox.runCode<string>();
		};

		const toolHandler = async (query: string | IDataObject): Promise<string> => {
			const { index } = this.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query } }]]);

			let response: string = '';
			let executionError: ExecutionError | undefined;
			try {
				response = await runFunction(query);
			} catch (error: unknown) {
				executionError = new NodeOperationError(this.getNode(), error as ExecutionError);
				response = `There was an error: "${executionError.message}"`;
			}

			if (typeof response === 'number') {
				response = (response as number).toString();
			}

			if (typeof response !== 'string') {
				// TODO: Do some more testing. Issues here should actually fail the workflow
				executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
					description: `The response property should be a string, but it is an ${typeof response}`,
				});
				response = `There was an error: "${executionError.message}"`;
			}

			if (executionError) {
				void this.addOutputData(NodeConnectionTypes.AiTool, index, executionError);
			} else {
				void this.addOutputData(NodeConnectionTypes.AiTool, index, [[{ json: { response } }]]);
			}

			return response;
		};

		const commonToolOptions = {
			name,
			description,
			func: toolHandler,
		};

		let tool: DynamicTool | DynamicStructuredTool | undefined = undefined;

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
					...commonToolOptions,
				});
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Error during parsing of JSON Schema. \n ' + error,
				);
			}
		} else {
			tool = new DynamicTool(commonToolOptions);
		}

		return {
			response: tool,
		};
	}
}

import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { N8nLlmTracing } from '../N8nLlmTracing';

import { ResponseManager } from './ResponseManager';
import { SimpleFakeChatModel } from './SimpleFakeChatModel';
import type { FakeResponseItem, SimpleFakeResponse, ToolCall } from './types';

export class LmFakeSimple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fake LLM (Simple)',
		name: 'lmFakeSimple',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Simple fake LLM that cycles through predefined responses for testing agents',
		defaults: {
			name: 'Fake LLM (Simple)',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Testing)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmfakesimple/',
					},
				],
			},
		},
		//hidden: true,
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		properties: [
			{
				displayName:
					'This node is for testing purposes only. It cycles through predefined responses when called by an agent.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{
						name: 'Text Only',
						value: 'text',
						description: 'Simple text responses that cycle through the list',
					},
					{
						name: 'With Tool Calls',
						value: 'tool_calls',
						description: 'Responses that include tool/function calls for testing agents',
					},
				],
				default: 'text',
				description: 'Format of the responses to generate',
			},
			{
				displayName: 'Text Responses',
				name: 'textResponses',
				type: 'fixedCollection',
				default: {
					values: [
						{ response: 'I need to use a tool to help with this task.' },
						{ response: 'Let me search for that information.' },
						{ response: 'Based on the results, here is the answer.' },
					],
				},
				placeholder: 'Add Response',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						displayName: 'Response',
						name: 'values',
						values: [
							{
								displayName: 'Response Text',
								name: 'response',
								type: 'string',
								default: '',
								description: 'The response text to return',
								typeOptions: {
									rows: 3,
								},
							},
						],
					},
				],
				displayOptions: {
					show: {
						responseFormat: ['text'],
					},
				},
			},
			{
				displayName: 'Tool Call Responses',
				name: 'toolCallResponses',
				type: 'fixedCollection',
				default: {
					values: [
						{
							content: 'I need to search for information.',
							toolCalls: {
								values: [
									{
										name: 'search',
										args: '{"query": "example search"}',
									},
								],
							},
						},
						{
							content: 'Let me calculate this for you.',
							toolCalls: {
								values: [
									{
										name: 'calculator',
										args: '{"expression": "2+2"}',
									},
								],
							},
						},
					],
				},
				placeholder: 'Add Tool Call Response',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						displayName: 'Tool Call Response',
						name: 'values',
						values: [
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'Text content of the response (optional)',
								typeOptions: {
									rows: 2,
								},
							},
							{
								displayName: 'Tool Calls',
								name: 'toolCalls',
								type: 'fixedCollection',
								default: { values: [] },
								placeholder: 'Add Tool Call',
								typeOptions: {
									multipleValues: true,
								},
								options: [
									{
										displayName: 'Tool Call',
										name: 'values',
										values: [
											{
												displayName: 'Tool/Function Name',
												name: 'name',
												type: 'string',
												default: '',
												required: true,
												description: 'Name of the tool/function to call',
											},
											{
												displayName: 'Arguments (JSON)',
												name: 'args',
												type: 'string',
												default: '{}',
												description: 'JSON string of arguments to pass to the tool',
												typeOptions: {
													rows: 2,
												},
											},
											{
												displayName: 'Call ID',
												name: 'id',
												type: 'string',
												default: '',
												description: 'Optional unique identifier for this tool call',
											},
										],
									},
								],
							},
						],
					},
				],
				displayOptions: {
					show: {
						responseFormat: ['tool_calls'],
					},
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const responseFormat = this.getNodeParameter('responseFormat', itemIndex, 'text') as
			| 'text'
			| 'tool_calls';

		// Set up tracing
		const tracingCallback = new N8nLlmTracing(this);

		// Get the singleton response manager
		const responseManager = ResponseManager.getInstance();

		// Process responses based on format
		let responses: FakeResponseItem[] = [];

		if (responseFormat === 'text') {
			const textResponsesData = this.getNodeParameter('textResponses', itemIndex, {
				values: [],
			}) as { values: Array<{ response: string }> };

			const extractedResponses =
				textResponsesData?.values?.map((item) => item.response).filter(Boolean) || [];

			responses =
				extractedResponses.length > 0
					? extractedResponses
					: ['I need to use a tool to help with this task.'];
		} else if (responseFormat === 'tool_calls') {
			const toolCallResponsesData = this.getNodeParameter('toolCallResponses', itemIndex, {
				values: [],
			}) as {
				values: Array<{
					content: string;
					toolCalls: { values: Array<{ name: string; args: string; id?: string }> };
				}>;
			};

			responses =
				toolCallResponsesData?.values?.map((responseItem) => {
					const toolCalls: ToolCall[] =
						responseItem.toolCalls?.values?.map((toolCallItem) => {
							let parsedArgs: Record<string, any> = {};
							try {
								parsedArgs = JSON.parse(toolCallItem.args || '{}');
							} catch (error) {
								console.warn('Invalid JSON in tool call arguments, using empty object:', error);
								parsedArgs = {};
							}

							return {
								id: toolCallItem.id,
								name: toolCallItem.name,
								args: parsedArgs,
							};
						}) || [];

					return {
						content: responseItem.content || '',
						toolCalls,
					} as SimpleFakeResponse;
				}) || [];

			// Provide default tool call response if none configured
			if (responses.length === 0) {
				responses = [
					{
						content: 'I need to search for information.',
						toolCalls: [
							{
								name: 'search',
								args: { query: 'example search' },
							},
						],
					} as SimpleFakeResponse,
				];
			}
		}

		// Configure the response manager with the responses
		responseManager.setResponses(responses);

		// Create and return the fake LLM instance
		const fakeLlm = new SimpleFakeChatModel([tracingCallback]);

		return {
			response: fakeLlm,
		};
	}
}

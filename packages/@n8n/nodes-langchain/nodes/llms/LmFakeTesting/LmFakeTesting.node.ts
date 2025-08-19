import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { FakeLlmSingleton } from './FakeLlmSingleton';
import type { FakeLlmConfig, FakeLlmResponse, ToolCall } from './types';
import { N8nLlmTracingAdapter } from './N8nLlmTracingAdapter';

export class LmFakeTesting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fake LLM (Testing)',
		name: 'lmFakeTesting',
		icon: 'fa:play',
		group: ['transform'],
		version: 1,
		description: 'Fake LLM for testing purposes only',
		defaults: {
			name: 'Fake LLM (Testing)',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmfaketesting/',
					},
				],
			},
		},
		// Mark as hidden - only available in testing environments
		//hidden: true,
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		properties: [
			{
				displayName:
					'This node is only for testing purposes and should not be used in production workflows.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Response Type',
				name: 'responseType',
				type: 'options',
				options: [
					{
						name: 'Fixed Response',
						value: 'fixed',
						description: 'Always return the same response',
					},
					{
						name: 'Sequential Responses',
						value: 'sequence',
						description: 'Return responses in sequence, cycling through the list',
					},
					{
						name: 'Error',
						value: 'error',
						description: 'Always throw an error for testing error handling',
					},
				],
				default: 'fixed',
				description: 'How the fake LLM should respond',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{
						name: 'Text Only',
						value: 'text',
						description: 'Simple text responses',
					},
					{
						name: 'With Tool Calls',
						value: 'tool_calls',
						description: 'Responses that include tool/function calls',
					},
				],
				default: 'text',
				description: 'Format of the responses to generate',
				displayOptions: {
					hide: {
						responseType: ['error'],
					},
				},
			},
			{
				displayName: 'Text Responses',
				name: 'textResponses',
				type: 'fixedCollection',
				default: { values: [{ response: 'This is a fake response for testing' }] },
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
					hide: {
						responseType: ['error'],
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
							content: 'I need to call a tool to help with this.',
							toolCalls: { values: [{ name: 'calculator', args: '{"expression": "2+2"}' }] },
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
					hide: {
						responseType: ['error'],
					},
				},
			},
			{
				displayName: 'Error Message',
				name: 'errorMessage',
				type: 'string',
				default: 'Fake LLM error for testing',
				description: 'The error message to throw when response type is set to error',
				displayOptions: {
					show: {
						responseType: ['error'],
					},
				},
			},
			{
				displayName: 'Tool Style',
				name: 'toolStyle',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'No tool calling capabilities',
					},
					{
						name: 'Function Calling',
						value: 'function_calling',
						description: 'Support function/tool calling',
					},
					{
						name: 'Structured Output',
						value: 'structured',
						description: 'Support structured output parsing',
					},
				],
				default: 'none',
				description: 'The type of tool calling support to simulate',
			},
			{
				displayName: 'Reset Configuration',
				name: 'resetConfig',
				type: 'boolean',
				default: false,
				description: 'Whether to reset the singleton configuration to defaults',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const responseType = this.getNodeParameter('responseType', itemIndex) as
			| 'fixed'
			| 'sequence'
			| 'error';
		const responseFormat = this.getNodeParameter('responseFormat', itemIndex, 'text') as
			| 'text'
			| 'tool_calls';
		const errorMessage = this.getNodeParameter(
			'errorMessage',
			itemIndex,
			'Fake LLM error for testing',
		) as string;
		const toolStyle = this.getNodeParameter('toolStyle', itemIndex, 'none') as
			| 'none'
			| 'function_calling'
			| 'structured';
		const resetConfig = this.getNodeParameter('resetConfig', itemIndex, false) as boolean;

		// Get the singleton instance
		const fakeLlmSingleton = FakeLlmSingleton.getInstance();

		// Create the tracing callback using adapter for parameter conversion
		const tracingCallback = new N8nLlmTracingAdapter(this);

		// Get the next run index (this will increment the counter)
		const runIndex = this.getNextRunIndex();

		// Reset singleton on the first run (runIndex 0) to ensure clean state across different workflow executions
		if (runIndex === 0) {
			fakeLlmSingleton.reset([tracingCallback]);
		}

		// Reset configuration if requested
		if (resetConfig) {
			fakeLlmSingleton.reset([tracingCallback]);
		}

		let responses: Array<string | FakeLlmResponse> = [];

		// Process responses based on format
		if (responseFormat === 'text') {
			const textResponsesData = this.getNodeParameter('textResponses', itemIndex, {
				values: [],
			}) as { values: Array<{ response: string }> };
			const extractedResponses =
				textResponsesData?.values?.map((item) => item.response).filter(Boolean) || [];
			responses =
				extractedResponses.length > 0
					? extractedResponses
					: ['This is a fake response for testing'];
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
					};
				}) || [];

			// Provide default tool call response if none configured
			if (responses.length === 0) {
				responses = [
					{
						content: 'I need to call a tool to help with this.',
						toolCalls: [
							{
								name: 'calculator',
								args: { expression: '2+2' },
							},
						],
					},
				];
			}
		}

		// Configure the fake LLM
		const config: Partial<FakeLlmConfig> = {
			responseType,
			responses,
			errorMessage,
			shouldThrowError: responseType === 'error',
			toolStyle,
		};

		fakeLlmSingleton.configure(config, [tracingCallback]);

		// Get the configured fake LLM instance
		const fakeLlm = fakeLlmSingleton.getFakeLlm();

		if (!fakeLlm) return { response: null };

		return {
			response: fakeLlm,
		};
	}
}

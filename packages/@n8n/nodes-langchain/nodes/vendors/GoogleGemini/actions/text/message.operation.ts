import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { GenerateContentResponse, Content, Tool } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('modelSearch'),
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ content: '' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be send',
						default: '',
						placeholder: 'e.g. Hello, how can you help me?',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
							{
								name: 'Model',
								value: 'model',
								description: 'Tell the model to adopt a specific tone or personality',
							},
						],
						default: 'user',
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Output Content as JSON',
		name: 'jsonOutput',
		type: 'boolean',
		description: 'Whether to attempt to return the response in JSON format',
		default: false,
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
			},
			{
				displayName: 'Code Execution',
				name: 'codeExecution',
				type: 'boolean',
				default: false,
				description:
					'Whether to allow the model to execute code it generates to produce a response. Supported only by certain models.',
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				default: 0,
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxOutputTokens',
				default: 16,
				description: 'The maximum number of tokens to generate in the completion',
				type: 'number',
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Number of Completions',
				name: 'candidateCount',
				default: 1,
				description: 'How many completions to generate for each prompt',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 8, // Google Gemini supports up to 8 candidates
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				default: 0,
				description:
					"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				default: 1,
				description:
					'Controls the randomness of the output. Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 1,
				description: 'The maximum cumulative probability of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top K)',
				name: 'topK',
				default: 1,
				description: 'The maximum number of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function getToolCalls(response: GenerateContentResponse) {
	return response.candidates.flatMap((c) => c.content.parts).filter((p) => 'functionCall' in p);
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('messages.values', i, []) as Array<{
		content: string;
		role: string;
	}>;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const jsonOutput = this.getNodeParameter('jsonOutput', i, false) as boolean;
	const options = this.getNodeParameter('options', i, {});

	const generationConfig = {
		frequencyPenalty: options.frequencyPenalty,
		maxOutputTokens: options.maxOutputTokens,
		candidateCount: options.candidateCount,
		presencePenalty: options.presencePenalty,
		temperature: options.temperature,
		topP: options.topP,
		topK: options.topK,
		responseMimeType: jsonOutput ? 'application/json' : undefined,
	};

	const nodeInputs = this.getNodeInputs();
	const availableTools = nodeInputs.some((i) => i.type === 'ai_tool')
		? await getConnectedTools(this, true)
		: [];
	const tools: Tool[] = [
		{
			functionDeclarations: availableTools.map((t) => ({
				name: t.name,
				description: t.description,
				parameters: {
					...zodToJsonSchema(t.schema, { target: 'openApi3' }),
					// Google Gemini API throws an error if `additionalProperties` field is present
					additionalProperties: undefined,
				},
			})),
		},
	];
	if (!tools[0].functionDeclarations?.length) {
		tools.pop();
	}

	if (options.codeExecution) {
		tools.push({
			codeExecution: {},
		});
	}

	const contents: Content[] = messages.map((m) => ({
		parts: [{ text: m.content }],
		role: m.role,
	}));
	const body = {
		tools,
		contents,
		generationConfig,
		systemInstruction: options.systemMessage
			? { parts: [{ text: options.systemMessage }] }
			: undefined,
	};

	let response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
		body,
	})) as GenerateContentResponse;

	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;
	const abortSignal = this.getExecutionCancelSignal();
	let currentIteration = 1;
	let toolCalls = getToolCalls(response);
	while (toolCalls.length) {
		if (
			(maxToolsIterations > 0 && currentIteration >= maxToolsIterations) ||
			abortSignal?.aborted
		) {
			break;
		}

		contents.push(...response.candidates.map((c) => c.content));

		for (const { functionCall } of toolCalls) {
			let toolResponse;
			for (const availableTool of availableTools) {
				if (availableTool.name === functionCall.name) {
					toolResponse = (await availableTool.invoke(functionCall.args)) as IDataObject;
				}
			}

			contents.push({
				parts: [
					{
						functionResponse: {
							id: functionCall.id,
							name: functionCall.name,
							response: {
								result: toolResponse,
							},
						},
					},
				],
				role: 'tool',
			});
		}

		response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
			body,
		})) as GenerateContentResponse;
		toolCalls = getToolCalls(response);
		currentIteration++;
	}

	if (simplify) {
		return response.candidates.map((candidate) => ({
			json: candidate,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}

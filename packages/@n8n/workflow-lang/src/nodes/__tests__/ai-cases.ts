/**
 * Equivalence cases of the AI nodes (`@n8n/n8n-nodes-langchain`): the vendor nodes, and the
 * root nodes with their sub-nodes (`subNodes`). All data is made up.
 */
import type { EquivalenceCase, SubNodeCase } from './equivalence.ts';

const LC = '@n8n/n8n-nodes-langchain.';
const openAi = { type: 'openAiApi', data: { apiKey: 'sk-fake' } };

/** A Chat Completions answer with one choice. */
const completion = (content: unknown) => ({
	body: {
		id: 'chatcmpl-1',
		object: 'chat.completion',
		created: 1,
		model: 'm',
		choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
		usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
	},
});

/** A Responses answer: a reasoning item, then a message with the content parts. */
const response = (...parts: unknown[]) => ({
	body: {
		id: 'resp_1',
		object: 'response',
		created_at: 1,
		status: 'completed',
		model: 'm',
		output: [
			{ type: 'reasoning', id: 'rs_1', summary: [] },
			{ type: 'message', id: 'msg_1', status: 'completed', role: 'assistant', content: parts },
		],
		usage: { input_tokens: 5, output_tokens: 2, total_tokens: 7 },
	},
});
const outputText = (text: string) => ({ type: 'output_text', text, annotations: [] });

const failed = (status: number, code = 'c') => ({
	status,
	body: { error: { message: 'bad thing', type: 't', code } },
});

/** The message of n8n's NodeApiError for each status of the cases. */
const STATUS_ERRORS: Record<number, string> = {
	400: 'Bad request - please check your parameters',
	401: 'Authorization failed - please check your credentials',
	404: 'The resource you are requesting could not be found',
	418: 'Your request is invalid or could not be processed by the service',
	429: 'The service is receiving too many requests from you',
	500: 'The service was not able to process your request',
	503: 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
	599: 'The service failed to process your request',
};

/** The chat model sub-node `lmChatOpenAi`. From version 1.2 the model is a resource locator. */
function openAiModel(
	typeVersion: number,
	name: string,
	options: Record<string, unknown> = {},
	extra: Record<string, unknown> = {},
): SubNodeCase {
	return {
		name: 'Model',
		type: `${LC}lmChatOpenAi`,
		typeVersion,
		parameters: {
			model: typeVersion >= 1.2 ? { __rl: true, mode: 'list', value: name } : name,
			options,
			...extra,
		},
		connection: 'ai_languageModel',
	};
}

const messages = {
	messageValues: [
		{ message: 'Answer {briefly}' },
		{ type: 'AIMessagePromptTemplate', message: 'ok' },
		{ type: 'HumanMessagePromptTemplate', message: 'first }{ question' },
		{},
	],
};

function chain(
	name: string,
	model: SubNodeCase,
	responses: EquivalenceCase['responses'],
	parameters: Record<string, unknown> = {},
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	return {
		name: `chainLlm ${name}`,
		type: `${LC}chainLlm`,
		typeVersion: 1.9,
		parameters: { promptType: 'define', text: 'Say hi to {name}', ...parameters },
		credential: openAi,
		subNodes: [model],
		responses,
		...extra,
	};
}

export const AI_CASES: EquivalenceCase[] = [
	// OpenAI versions 1 to 1.8: message a model (Chat Completions API)
	{
		name: 'openAi text.message',
		type: `${LC}openAi`,
		typeVersion: 1.8,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
			messages: {
				values: [
					{ content: 'Hello' },
					{ role: 'system', content: 'Be nice' },
					{ role: 'assistant' },
				],
			},
			options: {
				maxTokens: 20,
				topP: 0.5,
				temperature: 0.1,
				n: 2,
				frequency_penalty: 0.3,
				presence_penalty: 0.4,
				maxToolsIterations: 3,
			},
		},
		credential: { type: 'openAiApi', data: { apiKey: 'sk-fake', organizationId: 'org-fake' } },
		responses: [
			{
				body: {
					id: 'chatcmpl-1',
					error: null,
					choices: [
						{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' },
						{ index: 1, message: { role: 'assistant', content: 'Hey' }, finish_reason: 'stop' },
					],
					usage: { prompt_tokens: 5, completion_tokens: 2 },
				},
			},
		],
	},
	{
		name: 'openAi text.message json raw',
		type: `${LC}openAi`,
		typeVersion: 1.4,
		parameters: {
			resource: 'text',
			operation: 'message',
			modelId: { __rl: true, mode: 'id', value: 'gpt-4.1' },
			messages: { values: [{ role: 'user', content: 'Give JSON' }] },
			jsonOutput: true,
			simplify: false,
			hideTools: 'hide',
			options: {},
		},
		credential: {
			type: 'openAiApi',
			data: { apiKey: 'sk-fake', url: 'https://proxy.example.com/v1' },
		},
		responses: [
			{
				body: {
					id: 'chatcmpl-2',
					error: null,
					choices: [
						{ index: 0, message: { role: 'assistant', content: '{"a":1}' } },
						{ index: 1, message: { role: 'assistant', content: 'not json' } },
						{ index: 2, message: { role: 'assistant', content: null } },
					],
				},
			},
		],
	},
	{
		name: 'openAi text.message empty prompt',
		type: `${LC}openAi`,
		typeVersion: 1.8,
		parameters: {
			operation: 'message',
			modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
			messages: { values: [{ content: '  ' }] },
		},
		credential: openAi,
		responses: [completion('never')],
		expectedError: 'A non-empty prompt is required.',
	},
	// OpenAI versions 2 to 2.3: the Responses operation with the parameters that the editor adds
	{
		name: 'openAi text.response 2.1 no built-in tools',
		type: `${LC}openAi`,
		typeVersion: 2.1,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
			responses: { values: [{ content: 'Say hi' }] },
			builtInTools: {},
			options: { maxToolsIterations: 4 },
		},
		credential: openAi,
		responses: [response(outputText('Hi'))],
	},
	{
		name: 'openAi text.response 2',
		type: `${LC}openAi`,
		typeVersion: 2,
		parameters: {
			resource: 'text',
			operation: 'response',
			modelId: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
			responses: { values: [{ role: 'user', content: 'Say hi' }] },
			simplify: false,
			options: {},
		},
		credential: openAi,
		responses: [response(outputText('Hi'))],
	},
	// OpenAI: failed requests
	...[400, 401, 404, 418, 429, 500, 503, 599].flatMap((status): EquivalenceCase[] => [
		{
			name: `openAi text.message status ${status}`,
			type: `${LC}openAi`,
			typeVersion: 1.8,
			parameters: {
				modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
				messages: { values: [{ content: 'Hello' }] },
			},
			credential: openAi,
			responses: [failed(status)],
			expectedError: STATUS_ERRORS[status],
		},
		{
			name: `openAi text.response status ${status}`,
			type: `${LC}openAi`,
			typeVersion: 2.3,
			parameters: {
				modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
				responses: { values: [{ content: 'Hello' }] },
			},
			credential: openAi,
			responses: [failed(status)],
			expectedError: STATUS_ERRORS[status],
		},
	]),
	// Basic LLM Chain with the OpenAI chat model: Chat Completions API
	chain(
		'openAi completions',
		openAiModel(1.2, 'gpt-4o-mini', {
			temperature: 0.3,
			maxTokens: 100,
			topP: 0.9,
			frequencyPenalty: 0.1,
			presencePenalty: 0.2,
			timeout: 1000,
			maxRetries: 1,
		}),
		[completion('  Hi there \n')],
		{ messages, batching: { batchSize: 5, delayBetweenBatches: 0 } },
		{ credential: { type: 'openAiApi', data: { apiKey: 'sk-fake', organizationId: 'org-fake' } } },
	),
	chain(
		'openAi completions reasoning model',
		openAiModel(1.2, 'o3-mini', { maxTokens: 50, temperature: 0.5 }),
		[completion('Hi')],
		{ messages },
	),
	chain('openAi completions gpt-5-chat', openAiModel(1.1, 'gpt-5-chat-latest', { maxTokens: -1 }), [
		completion(null),
	]),
	chain(
		'openAi version 1 prompt, items',
		openAiModel(1, 'gpt-4', {}),
		[completion('one'), completion('two')],
		{ prompt: 'Old prompt', promptType: undefined, text: undefined },
		{ typeVersion: 1.3, items: [{ a: 1 }, { a: 2 }] },
	),
	chain(
		'openAi custom url, responses off',
		openAiModel(1.3, 'gpt-4o', {}, { responsesApiEnabled: false }),
		[completion('Hi')],
		{ text: '' },
		{
			typeVersion: 1.5,
			credential: {
				type: 'openAiApi',
				data: { apiKey: 'sk-fake', url: 'https://proxy.example.com/v1' },
			},
		},
	),
	chain(
		'openAi completions no choices',
		openAiModel(1.2, 'gpt-4o', {}),
		[{ body: { id: 'x', choices: [], usage: {} } }],
		{},
		{
			expectedError:
				'Received empty response from chat model call (no choices). Response body: {"id":"x","choices":[],"usage":{}}',
		},
	),
	// Basic LLM Chain with the OpenAI chat model: Responses API
	chain(
		'openAi responses',
		openAiModel(1.3, 'gpt-5', { maxTokens: 50, topP: 0.5, temperature: 0.3 }, { builtInTools: {} }),
		[response(outputText(' Hi'), { type: 'refusal', refusal: 'no' }, outputText('! '))],
		{ messages },
		{ typeVersion: 1.7 },
	),
	chain(
		'openAi model that prefers responses',
		openAiModel(1.2, 'gpt-5.2-pro', { frequencyPenalty: 0.2, maxTokens: 9 }),
		[response(outputText('Hi'))],
	),
	chain('openAi responses empty output', openAiModel(1.3, 'gpt-4o', {}), [
		{ body: { id: 'x', object: 'response', output: [], usage: {} } },
	]),
	chain(
		'openAi responses error in body',
		openAiModel(1.3, 'gpt-4o', {}),
		[{ body: { id: 'x', error: { message: 'boom', code: 'server_error' }, output: [] } }],
		{},
		{ expectedError: 'boom' },
	),
	// Failed requests
	chain(
		'openAi status 409',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(409), completion('late')],
		{},
		{ expectedError: 'Your request is invalid or could not be processed by the service' },
	),
	chain(
		'openAi status 400',
		openAiModel(1.3, 'gpt-4o', {}),
		[failed(400), completion('late')],
		{},
		{
			expectedError: 'Bad request - please check your parameters',
		},
	),
	chain(
		'openAi status 401',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(401), completion('late')],
		{},
		{
			expectedError: 'Authorization failed - please check your credentials',
		},
	),
	chain(
		'openAi status 403',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(403), completion('late')],
		{},
		{
			expectedError: 'Forbidden - perhaps check your credentials?',
		},
	),
	chain(
		'openAi status 404',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(404), completion('late')],
		{},
		{
			expectedError: 'The resource you are requesting could not be found',
		},
	),
	chain(
		'openAi status 429',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(429), completion('late')],
		{},
		{
			expectedError: 'OpenAI: Rate limit reached',
		},
	),
	chain(
		'openAi status 429 quota',
		openAiModel(1.2, 'gpt-4o', {}),
		[failed(429, 'insufficient_quota'), completion('late')],
		{},
		{
			expectedError:
				'Insufficient quota detected. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/common-issues/#insufficient-quota" target="_blank">Learn more</a> about resolving this issue',
		},
	),
	chain(
		'openAi status 500 no retry',
		openAiModel(1.2, 'gpt-4o', { maxRetries: 0 }),
		[failed(500), completion('late')],
		{},
		{ expectedError: '500 bad thing' },
	),
	chain('openAi status 500 then answer', openAiModel(1.2, 'gpt-4o', { maxRetries: 1 }), [
		failed(500),
		completion('late'),
	]),
	chain(
		'openAi status 503 twice',
		openAiModel(1.3, 'gpt-4o', { maxRetries: 1 }),
		[{ status: 503, body: { error: { message: { detail: 'down' } } } }],
		{},
		{ expectedError: '503 {"detail":"down"}' },
	),
];

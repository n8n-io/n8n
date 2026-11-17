/**
 * Equivalence cases of the AI nodes (`@n8n/n8n-nodes-langchain`). All data is made up.
 *
 * `AI_CASES` run as the other cases do (`equivalence.test.ts`): one node, no settings.
 * `AI_ENGINE_CASES` have sub-nodes (`subNodes`) or node settings. The recorder runs them in
 * n8n's engine. `ai-cluster.test.ts` converts a workflow with the node and compares the run
 * of the converted source with the recording: requests, outputs, errors, and the runs of
 * the sub-nodes.
 */
import type { EquivalenceCase, NodeSettings, SubNodeCase } from './equivalence.ts';

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

const gpt = openAiModel(1.2, 'gpt-4o', {});
const two = { items: [{ a: 1 }, { a: 2 }] };
const retry: NodeSettings = { retryOnFail: true, maxTries: 2, waitBetweenTries: 10 };

/** The OpenAI vendor node of versions 1 to 1.8 with node settings. */
function message(
	name: string,
	responses: EquivalenceCase['responses'],
	settings: NodeSettings,
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	return {
		name: `openAi text.message ${name}`,
		type: `${LC}openAi`,
		typeVersion: 1.8,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
			messages: { values: [{ content: '={{ $json.q }}' }] },
		},
		items: [{ q: 'one' }, { q: 'two' }],
		credential: openAi,
		responses,
		settings,
		...extra,
	};
}

/** The OpenAI vendor node of versions 2 to 2.3 with node settings. */
function responsesNode(
	name: string,
	responses: EquivalenceCase['responses'],
	settings: NodeSettings,
): EquivalenceCase {
	return {
		name: `openAi text.response ${name}`,
		type: `${LC}openAi`,
		typeVersion: 2.3,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
			responses: { values: [{ content: '={{ $json.q }}' }] },
		},
		items: [{ q: 'one' }, { q: 'two' }],
		credential: openAi,
		responses,
		settings,
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
	{
		name: 'openAi text.message custom header',
		type: `${LC}openAi`,
		typeVersion: 1.8,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'gpt-4o' },
			messages: { values: [{ content: 'Hello' }] },
		},
		credential: {
			type: 'openAiApi',
			data: { apiKey: 'sk-fake', header: true, headerName: 'X-Custom', headerValue: 'v1' },
		},
		responses: [completion('Hi')],
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
];

/** An answer of the Anthropic Messages API. */
const claude = (content: unknown[], stop = 'end_turn') => ({
	body: {
		id: 'msg_1',
		type: 'message',
		role: 'assistant',
		model: 'claude-x',
		content,
		stop_reason: stop,
		usage: { input_tokens: 5, output_tokens: 2 },
	},
});
const claudeText = (text: string) => ({ type: 'text', text });
const anthropic = { type: 'anthropicApi', data: { apiKey: 'sk-ant-fake' } };

function anthropicMessage(
	name: string,
	responses: EquivalenceCase['responses'],
	parameters: Record<string, unknown> = {},
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	return {
		name: `anthropic text.message ${name}`,
		type: `${LC}anthropic`,
		typeVersion: 1,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-4-5' },
			messages: { values: [{ content: 'Hello' }] },
			...parameters,
		},
		credential: anthropic,
		responses,
		...extra,
	};
}

export const ANTHROPIC_CASES: EquivalenceCase[] = [
	anthropicMessage('defaults', [claude([claudeText('Hi')])]),
	anthropicMessage(
		'options',
		[claude([claudeText('Hi '), { type: 'thinking', thinking: 'hm' }, claudeText('there')])],
		{
			resource: 'text',
			operation: 'message',
			modelId: { __rl: true, mode: 'id', value: 'claude-opus-4' },
			messages: {
				values: [
					{ content: 'Hello', role: 'user' },
					{ content: '  ', role: 'user' },
					{ content: 'Hi', role: 'assistant' },
					{ content: 'Again' },
				],
			},
			addAttachments: false,
			options: {
				includeMergedResponse: true,
				system: 'Be brief',
				promptCaching: '1h',
				maxTokens: 300,
				temperature: 0.2,
				topP: 0.8,
				topK: 4,
				maxToolsIterations: 2,
				codeExecution: false,
				webSearch: false,
				maxUses: 3,
			},
		},
		{
			credential: {
				type: 'anthropicApi',
				data: {
					apiKey: 'sk-ant-fake',
					url: 'https://proxy.example.com',
					header: true,
					headerName: 'X-Custom',
					headerValue: 'v1',
				},
			},
		},
	),
	anthropicMessage('status 401, then answer', [failed(401), claude([claudeText('Hi')])]),
	anthropicMessage('raw output', [claude([claudeText('Hi')])], {
		simplify: false,
		options: { includeMergedResponse: true, promptCaching: 'disabled' },
	}),
	anthropicMessage('paused turns', [
		claude([claudeText('one')], 'pause_turn'),
		claude([claudeText('two')], 'pause_turn'),
		claude([claudeText('three')], 'pause_turn'),
		claude([claudeText('four')], 'pause_turn'),
		claude([claudeText('never')]),
	]),
	anthropicMessage(
		'tool use without tools',
		[
			claude(
				[claudeText('I call'), { type: 'tool_use', id: 'tu_1', name: 'x', input: {} }],
				'tool_use',
			),
			claude([claudeText('no tool calls')], 'tool_use'),
			claude([claudeText('done')]),
		],
		{ options: { maxToolsIterations: 5 } },
	),
	anthropicMessage(
		'tool use at the iteration limit',
		[claude([{ type: 'tool_use', id: 'tu_1', name: 'x', input: {} }], 'tool_use')],
		{ options: { maxToolsIterations: 1 } },
	),
	anthropicMessage(
		'empty prompt',
		[claude([claudeText('never')])],
		{
			messages: { values: [{ content: ' ' }] },
		},
		{ expectedError: 'A non-empty prompt is required.' },
	),
	...[400, 401, 404, 418, 429, 500, 503, 599].map((status) =>
		anthropicMessage(
			`status ${status}`,
			[failed(status)],
			{},
			{
				expectedError: STATUS_ERRORS[status],
			},
		),
	),
];

/** An answer of the Gemini generateContent API. */
const gemini = (...candidates: unknown[][]) => ({
	body: {
		candidates: candidates.map((parts, index) => ({
			content: { parts, role: 'model' },
			finishReason: 'STOP',
			index,
		})),
		usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
		modelVersion: 'gemini-2.5-flash',
	},
});
const google = { type: 'googlePalmApi', data: { apiKey: 'fake-google-key' } };

function geminiMessage(
	name: string,
	responses: EquivalenceCase['responses'],
	parameters: Record<string, unknown> = {},
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	return {
		name: `googleGemini text.message ${name}`,
		type: `${LC}googleGemini`,
		typeVersion: 1.2,
		parameters: {
			modelId: { __rl: true, mode: 'list', value: 'models/gemini-2.5-flash' },
			messages: { values: [{ content: 'Hello' }] },
			...parameters,
		},
		credential: google,
		responses,
		...extra,
	};
}

export const GEMINI_CASES: EquivalenceCase[] = [
	geminiMessage('defaults', [gemini([{ text: 'Hi' }])]),
	geminiMessage(
		'options',
		[gemini([{ text: 'Hi ' }, { thought: true }, { text: 'there' }], [{ text: 'Second' }])],
		{
			resource: 'text',
			operation: 'message',
			messages: {
				values: [
					{ content: 'Hello', role: 'user' },
					{ content: '  ' },
					{ content: 'Hi', role: 'model' },
					{ content: 'Again' },
				],
			},
			jsonOutput: true,
			builtInTools: {},
			options: {
				includeMergedResponse: true,
				systemMessage: 'Be brief',
				frequencyPenalty: 0.1,
				maxOutputTokens: 200,
				candidateCount: 2,
				presencePenalty: 0.2,
				temperature: 0.3,
				topP: 0.9,
				topK: 5,
				thinkingBudget: 0,
				maxToolsIterations: 3,
			},
		},
		{
			typeVersion: 1.1,
			credential: {
				type: 'googlePalmApi',
				data: { apiKey: 'fake-google-key', host: 'https://proxy.example.com' },
			},
		},
	),
	geminiMessage(
		'version 1 raw output',
		[gemini([{ text: 'Hi' }])],
		{
			modelId: { __rl: true, mode: 'id', value: 'models/gemini-2.0-flash' },
			simplify: false,
			options: { codeExecution: false },
		},
		{ typeVersion: 1 },
	),
	geminiMessage(
		'function call without tools',
		[
			gemini([{ functionCall: { id: 'c1', name: 'x', args: {} } }]),
			gemini([{ functionCall: { name: 'y', args: {} } }]),
			gemini([{ text: 'done' }]),
		],
		{ options: { maxToolsIterations: 5 } },
	),
	geminiMessage(
		'function call at the iteration limit',
		[gemini([{ functionCall: { id: 'c1', name: 'x', args: {} } }])],
		{ options: { maxToolsIterations: 1 } },
	),
	geminiMessage(
		'gemma answers as another model',
		[gemini([{ text: 'Hi' }])],
		{
			modelId: { __rl: true, mode: 'list', value: 'models/gemma-3-27b-it' },
		},
		{ expectedError: 'Google returned a different model' },
	),
	geminiMessage(
		'answer without candidates',
		[{ body: { promptFeedback: {} } }],
		{},
		{
			expectedError: "Cannot read properties of undefined (reading 'flatMap')",
		},
	),
	geminiMessage(
		'empty prompt',
		[gemini([{ text: 'never' }])],
		{
			messages: { values: [{ content: ' ' }] },
		},
		{ expectedError: 'A non-empty prompt is required.' },
	),
	geminiMessage('status 401, then answer', [failed(401), gemini([{ text: 'Hi' }])]),
	...[400, 401, 404, 418, 429, 500, 503, 599].map((status) =>
		geminiMessage(
			`status ${status}`,
			[failed(status)],
			{},
			{
				expectedError: STATUS_ERRORS[status],
			},
		),
	),
];

const twoGeminiPrompts = {
	parameters: {
		modelId: { __rl: true, mode: 'list', value: 'models/gemini-2.5-flash' },
		messages: { values: [{ content: '={{ $json.q }}' }] },
		options: { temperature: '={{ $json.t }}' },
	},
	items: [
		{ q: 'one', t: 0.1 },
		{ q: 'two', t: 'warm' },
	],
};

export const GEMINI_ENGINE_CASES: EquivalenceCase[] = [
	geminiMessage(
		'stop, wrong option type',
		[gemini([{ text: 'a' }])],
		{},
		{
			...twoGeminiPrompts,
			settings: {},
			expectedError: 'Parameter "temperature" does not match any of the expected types: number',
		},
	),
	geminiMessage(
		'continue',
		[gemini([{ text: 'a' }])],
		{},
		{
			...twoGeminiPrompts,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	geminiMessage(
		'error output',
		[failed(503), gemini([{ text: 'b' }])],
		{},
		{
			...twoGeminiPrompts,
			items: [
				{ q: 'one', t: 0.1 },
				{ q: 'two', t: 0.2 },
			],
			settings: { onError: 'continueErrorOutput' },
		},
	),
	geminiMessage(
		'retry continue',
		[failed(500), gemini([{ text: 'a' }]), gemini([{ text: 'b' }]), gemini([{ text: 'c' }])],
		{},
		{
			...twoGeminiPrompts,
			items: [
				{ q: 'one', t: 0.1 },
				{ q: 'two', t: 0.2 },
			],
			settings: { ...retry, onError: 'continueRegularOutput' },
		},
	),
];

const twoPrompts = {
	parameters: {
		modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-4-5' },
		messages: { values: [{ content: '={{ $json.q }}' }] },
	},
	items: [{ q: 'one' }, { q: 'two' }],
};

export const AI_ENGINE_CASES: EquivalenceCase[] = [
	...GEMINI_ENGINE_CASES,
	// Anthropic vendor node under the error settings of n8n's engine
	anthropicMessage(
		'stop',
		[claude([claudeText('a')]), failed(400)],
		{},
		{
			...twoPrompts,
			settings: {},
			expectedError: STATUS_ERRORS[400],
		},
	),
	anthropicMessage(
		'continue',
		[failed(400), claude([claudeText('b')])],
		{},
		{
			...twoPrompts,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	anthropicMessage(
		'error output',
		[claude([claudeText('a')]), failed(503)],
		{},
		{
			...twoPrompts,
			settings: { onError: 'continueErrorOutput' },
		},
	),
	anthropicMessage(
		'retry continue',
		[failed(500), claude([claudeText('a')]), claude([claudeText('b')]), claude([claudeText('c')])],
		{},
		{ ...twoPrompts, settings: { ...retry, onError: 'continueRegularOutput' } },
	),
	anthropicMessage(
		'retry then answer',
		[claude([claudeText('a')]), failed(500), claude([claudeText('b')]), claude([claudeText('c')])],
		{},
		{ ...twoPrompts, settings: retry },
	),
	// OpenAI vendor node under the error settings of n8n's engine
	message('stop', [completion('a'), failed(400)], {}, { expectedError: STATUS_ERRORS[400] }),
	message('continue', [failed(400), completion('b')], { onError: 'continueRegularOutput' }),
	message('continue (old setting)', [completion('a'), failed(429)], { continueOnFail: true }),
	message('error output', [failed(503), completion('b')], { onError: 'continueErrorOutput' }),
	message('error output all fail', [failed(400)], { onError: 'continueErrorOutput' }),
	message('retry then answer', [failed(500), completion('a'), completion('b')], retry),
	message('retry continue', [failed(500), completion('a'), completion('b'), completion('c')], {
		...retry,
		onError: 'continueRegularOutput',
	}),
	message('retry error output', [failed(500), completion('a'), completion('b'), completion('c')], {
		...retry,
		onError: 'continueErrorOutput',
	}),
	message('always output data', [{ body: { id: 'x', choices: [] } }], { alwaysOutputData: true }),
	message('execute once', [completion('a'), completion('b')], { executeOnce: true }),
	responsesNode('continue', [failed(400), response(outputText('b'))], {
		onError: 'continueRegularOutput',
	}),
	responsesNode('error output', [response(outputText('a')), failed(404)], {
		onError: 'continueErrorOutput',
	}),
	responsesNode(
		'retry error output',
		[failed(500), response(outputText('a')), response(outputText('b')), response(outputText('c'))],
		{
			...retry,
			onError: 'continueErrorOutput',
		},
	),
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
		{ prompt: '=Old prompt {{ $json.a }}', promptType: undefined, text: undefined },
		{ typeVersion: 1.3, ...two },
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
	// v1 reads the parameters of the model for the first item only.
	chain(
		'openAi model from the item',
		openAiModel(1.2, '={{ $json.model }}', {
			temperature: '={{ $json.t }}',
		}),
		[completion('a'), completion('b')],
		{ text: '={{ $json.q }}' },
		{
			items: [
				{ model: 'gpt-4o', t: 0.1, q: 'one' },
				{ model: 'gpt-5.2-pro', t: 0.2, q: 'two' },
			],
		},
	),
	chain(
		'openAi completions no choices',
		gpt,
		[{ body: { id: 'x', choices: [], usage: {} } }],
		{},
		{
			expectedError:
				'Received empty response from chat model call (no choices). Response body: {"id":"x","choices":[],"usage":{}}',
		},
	),
	// The prompt: a value, no value, null
	chain(
		'prompt without a value',
		gpt,
		[completion('a')],
		{ text: '={{ $json.q }}' },
		{
			expectedError: 'No prompt specified',
		},
	),
	chain(
		'prompt from a path without a value',
		gpt,
		[completion('a')],
		{ text: '={{ $json.q.r }}' },
		{
			expectedError: 'No prompt specified',
		},
	),
	chain(
		'prompt null',
		gpt,
		[completion('a')],
		{ text: '={{ $json.n }}' },
		{ items: [{ n: null }] },
	),
	chain(
		'prompt number and object',
		gpt,
		[completion('a'), completion('b')],
		{
			text: '={{ $json.v }}',
		},
		{ items: [{ v: 5 }, { v: { a: [1] } }] },
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
	chain(
		'openAi responses part without annotations',
		openAiModel(1.3, 'gpt-4o', {}),
		[
			{
				body: {
					id: 'r',
					output: [{ type: 'message', content: [{ type: 'output_text', text: 'x' }] }],
				},
			},
		],
		{},
		{ expectedError: "Cannot read properties of undefined (reading 'map')" },
	),
	// The credential: organization, custom header
	chain(
		'credential with a custom header',
		gpt,
		[completion('a')],
		{},
		{
			credential: {
				type: 'openAiApi',
				data: { apiKey: 'sk-fake', header: true, headerName: 'X-Custom', headerValue: 'v1' },
			},
		},
	),
	chain(
		'credential with a custom header that is off',
		openAiModel(1.3, 'gpt-4o', {}),
		[response(outputText('a'))],
		{},
		{
			credential: {
				type: 'openAiApi',
				data: { apiKey: 'sk-fake', header: false, headerName: 'X-Custom', headerValue: 'v1' },
			},
		},
	),
	// Failed requests
	...[400, 401, 403, 404, 409].map((status) =>
		chain(
			`openAi status ${status}`,
			status === 400 ? openAiModel(1.3, 'gpt-4o', {}) : gpt,
			[failed(status), completion('late')],
			{},
			{
				expectedError:
					{
						400: STATUS_ERRORS[400],
						401: STATUS_ERRORS[401],
						403: 'Forbidden - perhaps check your credentials?',
						404: STATUS_ERRORS[404],
						409: STATUS_ERRORS[418],
					}[status] ?? '',
			},
		),
	),
	chain(
		'openAi status 429',
		gpt,
		[failed(429), completion('late')],
		{},
		{
			expectedError: 'OpenAI: Rate limit reached',
		},
	),
	chain(
		'openAi status 429 quota',
		gpt,
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
	// Items in batches, and the error settings
	chain(
		'batch of two, first fails',
		gpt,
		[failed(400), completion('late')],
		{},
		{
			...two,
			expectedError: STATUS_ERRORS[400],
		},
	),
	chain(
		'batch of two, second fails',
		gpt,
		[completion('first'), failed(400)],
		{},
		{
			...two,
			expectedError: STATUS_ERRORS[400],
		},
	),
	chain(
		'batch size 1, first fails',
		gpt,
		[failed(400), completion('late')],
		{
			batching: { batchSize: 1 },
		},
		{ ...two, expectedError: STATUS_ERRORS[400] },
	),
	chain(
		'version 1.5, first fails',
		gpt,
		[failed(400), completion('late')],
		{},
		{
			...two,
			typeVersion: 1.5,
			expectedError: STATUS_ERRORS[400],
		},
	),
	chain(
		'delay between batches',
		gpt,
		[completion('a'), completion('b'), completion('c')],
		{
			batching: { batchSize: 2, delayBetweenBatches: 30 },
		},
		{ items: [{ a: 1 }, { a: 2 }, { a: 3 }] },
	),
	chain(
		'continue',
		gpt,
		[failed(400), completion('late')],
		{},
		{
			...two,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	chain(
		'continue, prompt without a value',
		gpt,
		[completion('late')],
		{ text: '={{ $json.q }}' },
		{
			items: [{ a: 1 }, { q: 'x' }],
			settings: { onError: 'continueRegularOutput' },
		},
	),
	chain(
		'error output',
		gpt,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			settings: { onError: 'continueErrorOutput' },
		},
	),
	chain('retry, then answer', gpt, [failed(400), completion('late')], {}, { settings: retry }),
	chain(
		'retry, all fail',
		gpt,
		[failed(400)],
		{},
		{
			settings: retry,
			expectedError: STATUS_ERRORS[400],
		},
	),
	chain(
		'retry continue, first item fails',
		gpt,
		[failed(400), completion('ok'), completion('ok2'), completion('ok3')],
		{},
		{ ...two, settings: { ...retry, onError: 'continueRegularOutput' } },
	),
	chain(
		'retry continue, second item fails',
		gpt,
		[completion('ok'), failed(400)],
		{},
		{
			...two,
			settings: { ...retry, onError: 'continueRegularOutput' },
		},
	),
	chain(
		'retry error output',
		gpt,
		[failed(400), completion('ok'), completion('ok2'), completion('ok3')],
		{},
		{
			...two,
			settings: { ...retry, onError: 'continueErrorOutput' },
		},
	),
	chain(
		'execute once',
		gpt,
		[completion('a'), completion('b')],
		{},
		{
			...two,
			settings: { executeOnce: true },
		},
	),
	chain('always output data', gpt, [completion('a')], {}, { settings: { alwaysOutputData: true } }),
];

function agent(
	name: string,
	typeVersion: number,
	model: SubNodeCase,
	responses: EquivalenceCase['responses'],
	parameters: Record<string, unknown> = {},
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	return {
		name: `agent ${name}`,
		type: `${LC}agent`,
		typeVersion,
		parameters: { promptType: 'define', text: 'Ask {this}', options: {}, ...parameters },
		credential: openAi,
		subNodes: [model],
		responses,
		...extra,
	};
}

/** The Tools Agent without tools, memory and output parser, with the OpenAI chat model. */
export const AGENT_ENGINE_CASES: EquivalenceCase[] = [
	...[2, 2.1, 2.2, 3, 3.1].map((version) =>
		agent(`version ${version}`, version, gpt, [completion(' Hi there ')], {
			options: { systemMessage: 'Be {brief}' },
		}),
	),
	agent('responses, no system message', 3.1, openAiModel(1.3, 'gpt-5', {}), [
		response(outputText(' Hi'), { type: 'refusal', refusal: 'no' }, outputText('! ')),
	]),
	agent(
		'responses, reasoning model with system message',
		3,
		openAiModel(1.3, 'gpt-5-mini', { maxTokens: 40 }),
		[response(outputText(''))],
		{ options: { systemMessage: 'Be brief', enableStreaming: true, maxIterations: 4 } },
	),
	agent(
		'completions, reasoning model',
		2.2,
		openAiModel(1.2, 'o3-mini', { temperature: 0.4 }),
		[completion('Hi')],
		{ options: { systemMessage: 'Be brief' } },
	),
	agent('intermediate steps', 3.1, gpt, [completion('Hi')], {
		options: { returnIntermediateSteps: true },
	}),
	agent('intermediate steps, version 2', 2, gpt, [completion('Hi')], {
		options: { returnIntermediateSteps: true, systemMessage: '' },
	}),
	agent('empty answer', 3.1, gpt, [completion('')]),
	agent('answer without content', 2.2, gpt, [completion(null)]),
	agent(
		'no choices',
		3.1,
		gpt,
		[{ body: { id: 'x', choices: [] } }],
		{},
		{
			expectedError:
				'Received empty response from chat model call (no choices). Response body: {"id":"x","choices":[]}',
		},
	),
	agent(
		'prompt without a value',
		3.1,
		gpt,
		[completion('x')],
		{ text: '={{ $json.q }}' },
		{
			expectedError: 'No prompt specified',
		},
	),
	agent('empty prompt', 3.1, gpt, [completion('x')], { text: '' }),
	agent(
		'prompt null, number and object',
		3.1,
		gpt,
		[completion('a')],
		{ text: '={{ $json.v }}' },
		{
			items: [{ v: null }, { v: 5 }, { v: { a: [1] } }],
		},
	),
	agent(
		'prompt of the chat trigger',
		3.1,
		gpt,
		[completion('x')],
		{ promptType: 'auto' },
		{
			items: [{ chatInput: 'from chat' }],
		},
	),
	agent(
		'prompt of the chat trigger, missing',
		2.2,
		gpt,
		[completion('x')],
		{ promptType: 'auto' },
		{
			expectedError: 'No prompt specified',
		},
	),
	agent(
		'system message from the item',
		3.1,
		gpt,
		[completion('x')],
		{
			options: { systemMessage: '={{ $json.s }}' },
		},
		{ items: [{ s: 'from item' }, { other: 1 }, { s: '' }, { s: 7 }] },
	),
	// v1 reads the parameters of the model for the first item only.
	agent(
		'model from the item',
		3.1,
		openAiModel(1.2, '={{ $json.model }}', {}),
		[completion('a')],
		{},
		{ items: [{ model: 'gpt-4o' }, { model: 'gpt-4.1' }] },
	),
	agent(
		'credential with an organization',
		3.1,
		gpt,
		[completion('a')],
		{},
		{
			credential: { type: 'openAiApi', data: { apiKey: 'sk-fake', organizationId: 'org-fake' } },
		},
	),
	agent(
		'credential with a custom header',
		3.1,
		gpt,
		[completion('a')],
		{},
		{
			credential: {
				type: 'openAiApi',
				data: { apiKey: 'sk-fake', header: true, headerName: 'X-Custom', headerValue: 'v1' },
			},
		},
	),
	// Items in batches, and the error settings
	agent(
		'first item fails',
		3.1,
		gpt,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			expectedError: STATUS_ERRORS[400],
		},
	),
	agent(
		'first item fails, version 2.2',
		2.2,
		gpt,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			expectedError: STATUS_ERRORS[400],
		},
	),
	agent(
		'batch of two, second fails',
		3.1,
		gpt,
		[completion('first'), failed(400)],
		{
			options: { batching: { batchSize: 2 } },
		},
		{ ...two, expectedError: STATUS_ERRORS[400] },
	),
	agent(
		'batch of two, first fails',
		2.1,
		gpt,
		[failed(400), completion('late')],
		{
			options: { batching: { batchSize: 2, delayBetweenBatches: 0 } },
		},
		{ ...two, expectedError: STATUS_ERRORS[400] },
	),
	agent(
		'delay between batches',
		3.1,
		gpt,
		[completion('a'), completion('b'), completion('c')],
		{
			options: { batching: { batchSize: 2, delayBetweenBatches: 30 } },
		},
		{ items: [{ a: 1 }, { a: 2 }, { a: 3 }] },
	),
	agent(
		'delay between batches of one',
		3,
		gpt,
		[completion('a'), completion('b')],
		{
			options: { batching: { delayBetweenBatches: 20 } },
		},
		two,
	),
	agent(
		'continue',
		3.1,
		gpt,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	agent(
		'continue, version 2',
		2,
		gpt,
		[completion('ok'), failed(429)],
		{},
		{
			...two,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	agent(
		'error output',
		3.1,
		gpt,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			settings: { onError: 'continueErrorOutput' },
		},
	),
	agent('retry, then answer', 3.1, gpt, [failed(400), completion('late')], {}, { settings: retry }),
	agent(
		'retry, all fail',
		2.2,
		gpt,
		[failed(400)],
		{},
		{
			settings: retry,
			expectedError: STATUS_ERRORS[400],
		},
	),
	agent(
		'retry continue',
		3.1,
		gpt,
		[failed(400), completion('ok'), completion('ok2'), completion('ok3')],
		{},
		{
			...two,
			settings: { ...retry, onError: 'continueRegularOutput' },
		},
	),
	agent(
		'retry error output',
		3.1,
		gpt,
		[failed(400), completion('ok'), completion('ok2'), completion('ok3')],
		{},
		{
			...two,
			settings: { ...retry, onError: 'continueErrorOutput' },
		},
	),
	agent('status 500 then answer', 3.1, openAiModel(1.2, 'gpt-4o', { maxRetries: 1 }), [
		failed(500),
		completion('late'),
	]),
	agent(
		'execute once',
		3.1,
		gpt,
		[completion('a'), completion('b')],
		{},
		{
			...two,
			settings: { executeOnce: true },
		},
	),
	agent(
		'always output data',
		3.1,
		gpt,
		[completion('a')],
		{},
		{
			settings: { alwaysOutputData: true },
		},
	),
];

/** Clusters that stay in the fallback host: the proof of the native form does not cover them. */
export const AI_HOST_CASES: EquivalenceCase[] = [
	chain(
		'credential with an organization and a custom header',
		gpt,
		[completion('a')],
		{},
		{
			credential: {
				type: 'openAiApi',
				data: {
					apiKey: 'sk-fake',
					organizationId: 'org-fake',
					header: true,
					headerName: 'X-Custom',
					headerValue: 'v1',
				},
			},
		},
	),
];

/** The chat model sub-node `lmChatOpenRouter`. */
function openRouterModel(name: string, options: Record<string, unknown> = {}): SubNodeCase {
	return {
		name: 'Model',
		type: `${LC}lmChatOpenRouter`,
		typeVersion: 1,
		parameters: { model: name, options },
		connection: 'ai_languageModel',
	};
}
const openRouter = {
	credential: {
		type: 'openRouterApi',
		data: { apiKey: 'sk-or-fake', url: 'https://openrouter.ai/api/v1' },
	},
};
const router = openRouterModel('anthropic/claude-sonnet-4');

/** The chain and the agent with the OpenRouter chat model. */
const OPEN_ROUTER_CASES: EquivalenceCase[] = [
	chain(
		'openRouter options',
		openRouterModel('openai/gpt-4.1-mini', {
			temperature: 0.3,
			maxTokens: 50,
			topP: 0.9,
			frequencyPenalty: 0.1,
			presencePenalty: 0.2,
			timeout: 1000,
			maxRetries: 1,
		}),
		[completion(' Hi ')],
		{ messages },
		openRouter,
	),
	chain('openRouter defaults', router, [completion('Hi')], {}, openRouter),
	chain(
		'openRouter reasoning model with a vendor prefix',
		openRouterModel('openai/o3-mini', {
			maxTokens: 5,
		}),
		[completion('Hi')],
		{ messages },
		openRouter,
	),
	chain(
		'openRouter reasoning model without a prefix',
		openRouterModel('o3-mini', {
			maxTokens: 5,
		}),
		[completion('Hi')],
		{ messages },
		openRouter,
	),
	chain(
		'openRouter model that prefers responses',
		openRouterModel('openai/gpt-5.1-codex', {
			maxTokens: 5,
		}),
		[response(outputText(' Hi '))],
		{ messages },
		openRouter,
	),
	chain(
		'openRouter another url',
		router,
		[completion('x')],
		{},
		{
			credential: {
				type: 'openRouterApi',
				data: { apiKey: 'k', url: 'https://proxy.example.com/v1' },
			},
		},
	),
	chain(
		'openRouter error in the body',
		router,
		[{ body: { error: { message: 'provider down', code: 502 } } }],
		{},
		{
			...openRouter,
			expectedError:
				'Received empty response from chat model call (no choices). Response body: {"error":{"message":"provider down","code":502}}',
		},
	),
	...[400, 401, 404].map((status) =>
		chain(
			`openRouter status ${status}`,
			router,
			[failed(status), completion('late')],
			{},
			{
				...openRouter,
				expectedError: STATUS_ERRORS[status],
			},
		),
	),
	chain(
		'openRouter status 429',
		router,
		[failed(429), completion('late')],
		{},
		{
			...openRouter,
			expectedError: 'OpenAI: Rate limit reached',
		},
	),
	chain(
		'openRouter status 500 then answer',
		openRouterModel('m', { maxRetries: 1 }),
		[failed(500), completion('late')],
		{},
		openRouter,
	),
	chain(
		'openRouter continue',
		router,
		[failed(400), completion('late')],
		{},
		{
			...two,
			...openRouter,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	agent(
		'openRouter',
		3.1,
		router,
		[completion(' Hi ')],
		{
			options: { systemMessage: 'Be brief' },
		},
		openRouter,
	),
	agent(
		'openRouter, version 2.2, error output',
		2.2,
		router,
		[failed(400), completion('ok')],
		{},
		{
			...two,
			...openRouter,
			settings: { onError: 'continueErrorOutput' },
		},
	),
];

/** The prompt that a chat trigger or a guardrails node gives. */
const PROMPT_SOURCE_CASES: EquivalenceCase[] = [
	chain(
		'prompt of the chat trigger',
		gpt,
		[completion('x')],
		{ promptType: 'auto', text: undefined },
		{
			items: [{ chatInput: 'from chat' }],
		},
	),
	chain(
		'prompt of the chat trigger, missing',
		gpt,
		[completion('x')],
		{
			promptType: 'auto',
			text: undefined,
		},
		{ typeVersion: 1.5, expectedError: 'No prompt specified' },
	),
	chain(
		'prompt of the guardrails node',
		gpt,
		[completion('x')],
		{
			promptType: 'guardrails',
			text: undefined,
		},
		{ items: [{ guardrailsInput: 'checked' }] },
	),
	agent(
		'prompt of the guardrails node',
		3.1,
		gpt,
		[completion('x')],
		{ promptType: 'guardrails' },
		{
			items: [{ guardrailsInput: 'checked' }],
		},
	),
];

/** Every case that runs in the engine of n8n and through the converter. */
export const ENGINE_CASES: EquivalenceCase[] = [
	...AI_ENGINE_CASES,
	...AGENT_ENGINE_CASES,
	...PROMPT_SOURCE_CASES,
	...OPEN_ROUTER_CASES,
];

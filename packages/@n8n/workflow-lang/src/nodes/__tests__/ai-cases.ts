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
	agent('empty system message, version 2', 2, gpt, [completion('Hi')], {
		options: { systemMessage: '' },
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
	{
		name: 'chainLlm gemini credential with another host',
		type: `${LC}chainLlm`,
		typeVersion: 1.9,
		parameters: { promptType: 'define', text: 'Q' },
		credential: { type: 'googlePalmApi', data: { apiKey: 'k', host: 'https://proxy.example.com' } },
		subNodes: [
			{
				name: 'Model',
				type: `${LC}lmChatGoogleGemini`,
				typeVersion: 1,
				parameters: { modelName: 'models/gemini-2.5-flash', options: {} },
				connection: 'ai_languageModel',
			},
		],
		responses: [],
	},
	{
		name: 'chainLlm anthropic credential with a gateway URL',
		type: `${LC}chainLlm`,
		typeVersion: 1.9,
		parameters: { promptType: 'define', text: 'Q' },
		credential: { type: 'anthropicApi', data: { apiKey: 'k', url: 'https://proxy.example.com' } },
		subNodes: [
			{
				name: 'Model',
				type: `${LC}lmChatAnthropic`,
				typeVersion: 1.3,
				parameters: {
					model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-5' },
					options: {},
				},
				connection: 'ai_languageModel',
			},
		],
		responses: [],
	},
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

/** An answer of the model that calls a tool. The agents of these cases have no tools. */
const toolCall = (content: string | null = null) => ({
	body: {
		id: 'chatcmpl-1',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content,
					tool_calls: [
						{
							id: 'call_1',
							type: 'function',
							function: { name: 'lookup', arguments: '{ "a": 1 }' },
						},
					],
				},
				finish_reason: 'tool_calls',
			},
		],
	},
});
const functionCall = {
	body: {
		id: 'resp_1',
		object: 'response',
		output: [
			{ type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'lookup', arguments: '{}' },
		],
	},
};

/** The model calls a tool, and the agent has none. */
const TOOL_CALL_CASES: EquivalenceCase[] = [
	...[3, 3.1].flatMap((version) => [
		agent(`${version}, tool call, then answer`, version, gpt, [toolCall(), completion('after')]),
		agent(
			`${version}, tool calls up to the limit`,
			version,
			gpt,
			[toolCall()],
			{
				options: { maxIterations: 3, returnIntermediateSteps: true },
			},
			{
				expectedError:
					'Max iterations (3) reached. The agent could not complete the task within the allowed number of iterations.',
			},
		),
	]),
	agent(
		'3.1, tool calls up to the default limit',
		3.1,
		gpt,
		[toolCall('thinking')],
		{},
		{
			expectedError:
				'Max iterations (10) reached. The agent could not complete the task within the allowed number of iterations.',
		},
	),
	agent('3.1, function call of the Responses API', 3.1, openAiModel(1.3, 'gpt-4o', {}), [
		functionCall,
		response(outputText('after')),
	]),
	agent(
		'3.1, two items, the first calls a tool',
		3.1,
		gpt,
		[toolCall(), completion('b'), completion('c'), completion('d')],
		{},
		two,
	),
	agent(
		'3.1, tool calls up to the limit, continue',
		3.1,
		gpt,
		[toolCall()],
		{
			options: { maxIterations: 2 },
		},
		{ ...two, settings: { onError: 'continueRegularOutput' } },
	),
	...[2, 2.1, 2.2].flatMap((version) => [
		agent(`${version}, tool call, then answer`, version, gpt, [
			toolCall('thinking aloud'),
			completion('after'),
		]),
		agent(`${version}, tool calls up to the limit`, version, gpt, [toolCall()], {
			options: { maxIterations: 3 },
		}),
	]),
];

const refused = { body: {}, networkError: 'ECONNREFUSED' };

/** A request that fails without an answer. */
const NETWORK_CASES: EquivalenceCase[] = [
	...['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'EHOSTUNREACH'].flatMap(
		(code) => [
			message(`network ${code}, continue`, [{ body: {}, networkError: code }, completion('late')], {
				onError: 'continueRegularOutput',
			}),
			chain(
				`network ${code}, continue`,
				openAiModel(1.2, 'gpt-4o', { maxRetries: 0 }),
				[{ body: {}, networkError: code }, completion('late')],
				{},
				{ ...two, settings: { onError: 'continueRegularOutput' } },
			),
		],
	),
	message(
		'network, stop',
		[refused],
		{},
		{
			expectedError: 'The service refused the connection - perhaps it is offline',
		},
	),
	message('network, error output', [completion('a'), refused], { onError: 'continueErrorOutput' }),
	responsesNode('network, continue', [refused, response(outputText('b'))], {
		onError: 'continueRegularOutput',
	}),
	anthropicMessage(
		'network, continue',
		[refused, claude([claudeText('b')])],
		{},
		{
			...twoPrompts,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	geminiMessage(
		'network, error output',
		[refused, gemini([{ text: 'b' }])],
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
	chain('network, then answer', openAiModel(1.2, 'gpt-4o', { maxRetries: 1 }), [
		refused,
		completion('late'),
	]),
	chain(
		'network twice, stop',
		openAiModel(1.2, 'gpt-4o', { maxRetries: 1 }),
		[refused],
		{},
		{
			expectedError: 'Connection error.',
		},
	),
	agent(
		'network, error output',
		3.1,
		openAiModel(1.2, 'gpt-4o', { maxRetries: 0 }),
		[refused, completion('ok')],
		{},
		{ ...two, settings: { onError: 'continueErrorOutput' } },
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

/** The chat model sub-node `lmChatAnthropic`. From version 1.3 the model is a resource locator. */
function anthropicModel(
	typeVersion: number,
	name: string,
	options: Record<string, unknown> = {},
): SubNodeCase {
	return {
		name: 'Model',
		type: `${LC}lmChatAnthropic`,
		typeVersion,
		parameters: {
			model: typeVersion >= 1.3 ? { __rl: true, mode: 'list', value: name } : name,
			options,
		},
		connection: 'ai_languageModel',
	};
}
const sonnet = anthropicModel(1.3, 'claude-sonnet-4-5');
const withAnthropic = { credential: anthropic };
const anthropicFailed = (status: number, text = 'bad thing') => ({
	status,
	body: { type: 'error', error: { type: 'invalid_request_error', message: text } },
});
const systemFirst = {
	messageValues: [
		{ message: 'Answer {briefly}' },
		{ type: 'AIMessagePromptTemplate', message: 'ok' },
		{ type: 'HumanMessagePromptTemplate', message: 'first' },
		{ type: 'HumanMessagePromptTemplate', message: 'second' },
	],
};

/** The chain and the agent with the Anthropic chat model. */
const ANTHROPIC_MODEL_CASES: EquivalenceCase[] = [
	chain(
		'anthropic defaults',
		sonnet,
		[claude([claudeText(' Hi '), claudeText('there ')])],
		{},
		withAnthropic,
	),
	chain(
		'anthropic version 1.5',
		anthropicModel(1.5, 'claude-sonnet-4-5'),
		[claude([{ type: 'thinking', thinking: 'hm', signature: 's' }, claudeText('Hi')])],
		{ messages: systemFirst },
		withAnthropic,
	),
	chain(
		'anthropic version 1.2',
		anthropicModel(1.2, 'claude-3-5-sonnet-20240620', {
			maxTokensToSample: 300,
			temperature: 0.2,
		}),
		[claude([])],
		{ messages: { messageValues: [{ message: '' }] }, text: '' },
		withAnthropic,
	),
	...[
		['claude-3-haiku-20240307', { temperature: 0.2 }],
		['claude-3-haiku-20240307', { topP: 0.9 }],
		['claude-3-7-sonnet-20250219', { topK: 3 }],
		['claude-3-5-haiku-latest', { topK: -1, topP: 0.5 }],
		['claude-haiku-4-5', { temperature: 0.2, topK: 4 }],
		['claude-sonnet-4-20250514', { temperature: 0.3 }],
		['claude-sonnet-4-6', { temperature: 0.3 }],
		['claude-opus-4', { temperature: 0.2 }],
		['claude-opus-4-20250514', { temperature: 0.2, maxTokensToSample: 8192 }],
		['claude-opus-4-5', { temperature: 0.2 }],
		['claude-opus-4-6-20260101', { temperature: 0.2 }],
		['claude-opus-4-7', { temperature: 0.2, topK: 5, topP: 0.8, maxTokensToSample: 50 }],
		['claude-opus-4-10', { temperature: 0.2 }],
		['claude-opus-5', { temperature: 0.2 }],
		['claude-sonnet-5', { temperature: 0.2 }],
		['claude-fable-5-2', { topP: 0.2 }],
		['claude-2.1', { temperature: 0.2 }],
		['claude-instant-1', { temperature: 0.2 }],
		['my-gateway-model', { temperature: 0.2, topK: 2 }],
	].map(([name, options]) =>
		chain(
			`anthropic sampling ${String(name)} ${Object.keys(options).join(' ')}`,
			anthropicModel(1.5, String(name), typeof options === 'object' ? options : {}),
			[claude([claudeText('Hi')])],
			{},
			withAnthropic,
		),
	),
	chain(
		'anthropic system message that is not first',
		sonnet,
		[claude([claudeText('x')])],
		{
			messages: {
				messageValues: [{ type: 'AIMessagePromptTemplate', message: 'a' }, { message: 'late' }],
			},
		},
		{
			...withAnthropic,
			expectedError: 'System messages are only permitted as the first passed message.',
		},
	),
	chain(
		'anthropic tokens above the limit without a stream',
		anthropicModel(1.3, 'claude-sonnet-4-5', {
			maxTokensToSample: 30000,
		}),
		[claude([claudeText('x')])],
		{},
		{
			...withAnthropic,
			expectedError:
				'Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details',
		},
	),
	chain(
		'anthropic opus 4.1 default tokens',
		anthropicModel(1.5, 'claude-opus-4-1-20250805'),
		[claude([claudeText('x')])],
		{},
		{
			...withAnthropic,
			expectedError:
				'Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details',
		},
	),
	chain(
		'anthropic tool use in the answer',
		sonnet,
		[
			claude(
				[claudeText('I call'), { type: 'tool_use', id: 'tu', name: 'x', input: {} }],
				'tool_use',
			),
		],
		{},
		{ ...withAnthropic, expectedError: 'Cannot coerce "tool_use" message part into a string.' },
	),
	chain(
		'anthropic custom header',
		sonnet,
		[claude([claudeText('Hi')])],
		{},
		{
			credential: {
				type: 'anthropicApi',
				data: { apiKey: 'k', header: true, headerName: 'X-Custom', headerValue: 'v1' },
			},
		},
	),
	...[
		[400, STATUS_ERRORS[400]],
		[401, STATUS_ERRORS[401]],
		[403, 'Forbidden - perhaps check your credentials?'],
		[404, STATUS_ERRORS[404]],
		[409, STATUS_ERRORS[418]],
	].map(([status, text]) =>
		chain(
			`anthropic status ${status}`,
			sonnet,
			[anthropicFailed(Number(status)), claude([claudeText('late')])],
			{},
			{
				...withAnthropic,
				expectedError: String(text),
			},
		),
	),
	chain(
		'anthropic status 429, then answer',
		sonnet,
		[anthropicFailed(429), claude([claudeText('late')])],
		{},
		withAnthropic,
	),
	chain(
		'anthropic status 500 seven times',
		sonnet,
		[anthropicFailed(500, 'boom')],
		{},
		{
			...withAnthropic,
			expectedError:
				'500 {"type":"error","error":{"type":"invalid_request_error","message":"boom"}}',
		},
	),
	chain(
		'anthropic status 502 with a text body, then answer',
		sonnet,
		[{ status: 502, body: 'Bad Gateway' }, claude([claudeText('late')])],
		{},
		withAnthropic,
	),
	chain(
		'anthropic network, then answer',
		sonnet,
		[refused, claude([claudeText('late')])],
		{},
		withAnthropic,
	),
	chain(
		'anthropic sampling parameter refused',
		anthropicModel(1.3, 'claude-sonnet-4-5', { temperature: 0.2 }),
		[anthropicFailed(400, '`temperature` is deprecated for this model.')],
		{},
		{
			...withAnthropic,
			expectedError:
				'The model "claude-sonnet-4-5" does not support the Sampling Temperature, Top K, or Top P options. Remove them from Options and try again.',
		},
	),
	chain(
		'anthropic sampling parameter not supported, status 500',
		sonnet,
		[anthropicFailed(500, 'top_k: not supported')],
		{},
		{
			...withAnthropic,
			expectedError:
				'The model "claude-sonnet-4-5" does not support the Sampling Temperature, Top K, or Top P options. Remove them from Options and try again.',
		},
	),
	chain(
		'anthropic continue',
		sonnet,
		[anthropicFailed(400), claude([claudeText('late')])],
		{},
		{
			...two,
			...withAnthropic,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	agent(
		'anthropic',
		3.1,
		sonnet,
		[claude([claudeText(' Hi '), claudeText('there ')])],
		{
			options: { systemMessage: 'Be brief' },
		},
		withAnthropic,
	),
	agent(
		'anthropic, version 2.2, thinking only',
		2.2,
		anthropicModel(1.5, 'claude-sonnet-4-5'),
		[claude([{ type: 'thinking', thinking: ' hm ', signature: 's' }])],
		{},
		withAnthropic,
	),
	agent(
		'anthropic, tool use, version 3.1',
		3.1,
		sonnet,
		[
			claude([{ type: 'tool_use', id: 'tu', name: 'x', input: { a: 1 } }], 'tool_use'),
			claude([claudeText('after')]),
		],
		{},
		withAnthropic,
	),
	agent(
		'anthropic, tool use, version 2.2',
		2.2,
		sonnet,
		[
			claude(
				[claudeText('pre'), { type: 'tool_use', id: 'tu', name: 'x', input: { a: 1 } }],
				'tool_use',
			),
			claude([claudeText('after')]),
		],
		{},
		withAnthropic,
	),
	agent(
		'anthropic, error output',
		3,
		sonnet,
		[anthropicFailed(400), claude([claudeText('ok')])],
		{},
		{
			...two,
			...withAnthropic,
			settings: { onError: 'continueErrorOutput' },
		},
	),
];

/** The chat model sub-node `lmChatGoogleGemini`. */
function geminiChatModel(
	typeVersion: number,
	name: string,
	options: Record<string, unknown> = {},
): SubNodeCase {
	return {
		name: 'Model',
		type: `${LC}lmChatGoogleGemini`,
		typeVersion,
		parameters: { modelName: name, options },
		connection: 'ai_languageModel',
	};
}
const flash = geminiChatModel(1, 'models/gemini-2.5-flash');
const withGoogle = {
	credential: {
		type: 'googlePalmApi',
		data: { apiKey: 'fake-google-key', host: 'https://generativelanguage.googleapis.com' },
	},
};
const geminiFailed = (status: number, text = 'bad thing') => ({
	status,
	body: { error: { code: status, message: text, status: 'INVALID_ARGUMENT' } },
});
const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** The chain and the agent with the Google Gemini chat model. */
const GEMINI_MODEL_CASES: EquivalenceCase[] = [
	chain('gemini defaults', flash, [gemini([{ text: ' Hi ' }, { text: 'there ' }])], {}, withGoogle),
	chain(
		'gemini options and messages',
		geminiChatModel(1.1, 'models/gemini-2.5-pro', {
			maxOutputTokens: 100,
			temperature: 0.2,
			topK: 5,
			topP: 0.8,
			safetySettings: {
				values: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }],
			},
		}),
		[gemini([{ text: 'thinking', thought: true }, { text: 'Hi' }])],
		{ messages: systemFirst },
		withGoogle,
	),
	chain(
		'gemini model without a prefix',
		geminiChatModel(1, 'gemini-2.0-flash'),
		[gemini([])],
		{
			messages: { messageValues: [{ message: '' }] },
			text: '',
		},
		withGoogle,
	),
	chain(
		'gemini system message that is not first',
		flash,
		[gemini([{ text: 'x' }])],
		{
			messages: { messageValues: [{ message: 'A' }, { message: 'B' }] },
		},
		{ ...withGoogle, expectedError: 'System message should be the first one' },
	),
	chain(
		'gemini blocked prompt',
		flash,
		[{ body: { promptFeedback: { blockReason: 'SAFETY' } } }],
		{},
		{
			...withGoogle,
			expectedError: 'Gemini blocked the prompt (reason: SAFETY)',
		},
	),
	chain(
		'gemini no candidates',
		flash,
		[{ body: { candidates: [] } }],
		{},
		{
			...withGoogle,
			expectedError: 'Gemini returned an empty response',
		},
	),
	chain(
		'gemini candidate without content',
		flash,
		[{ body: { candidates: [{ finishReason: 'SAFETY', index: 0 }] } }],
		{},
		{ ...withGoogle, expectedError: "Cannot read properties of undefined (reading 'parts')" },
	),
	chain(
		'gemini part that is not text',
		flash,
		[gemini([{ text: 'a' }, { inlineData: { mimeType: 'image/png', data: 'AA' } }])],
		{},
		{ ...withGoogle, expectedError: 'Cannot coerce "inlineData" message part into a string.' },
	),
	...[
		[400, STATUS_ERRORS[400]],
		[401, STATUS_ERRORS[401]],
		[403, 'Forbidden - perhaps check your credentials?'],
		[404, STATUS_ERRORS[404]],
		[409, STATUS_ERRORS[418]],
	].map(([status, text]) =>
		chain(
			`gemini status ${status}`,
			flash,
			[geminiFailed(Number(status)), gemini([{ text: 'late' }])],
			{},
			{
				...withGoogle,
				expectedError: String(text),
			},
		),
	),
	chain(
		'gemini status 429, then answer',
		flash,
		[geminiFailed(429), gemini([{ text: 'late' }])],
		{},
		withGoogle,
	),
	chain(
		'gemini network, then answer',
		flash,
		[refused, gemini([{ text: 'late' }])],
		{},
		withGoogle,
	),
	chain(
		'gemini status 500 seven times',
		flash,
		[geminiFailed(500, 'boom')],
		{},
		{
			...withGoogle,
			expectedError: `[GoogleGenerativeAI Error]: Error fetching from ${GEMINI_URL}: [500 ] boom`,
		},
	),
	chain(
		'gemini network seven times',
		flash,
		[refused],
		{},
		{
			...withGoogle,
			expectedError: `[GoogleGenerativeAI Error]: Error fetching from ${GEMINI_URL}: fetch failed`,
		},
	),
	chain(
		'gemini continue',
		flash,
		[geminiFailed(400), gemini([{ text: 'late' }])],
		{},
		{
			...two,
			...withGoogle,
			settings: { onError: 'continueRegularOutput' },
		},
	),
	agent(
		'gemini',
		3.1,
		flash,
		[gemini([{ text: ' Hi ' }, { text: 'there ' }])],
		{
			options: { systemMessage: 'Be brief' },
		},
		withGoogle,
	),
	agent(
		'gemini, one text part',
		2.2,
		geminiChatModel(1.1, 'models/gemini-2.5-flash'),
		[gemini([{ text: ' Hi ' }])],
		{},
		withGoogle,
	),
	agent(
		'gemini, one text part, version 3.1',
		3.1,
		flash,
		[gemini([{ text: ' Hi ' }])],
		{},
		withGoogle,
	),
	agent(
		'gemini, thought and text',
		3.1,
		flash,
		[gemini([{ text: ' thinking ', thought: true }, { text: ' Hi ' }])],
		{},
		withGoogle,
	),
	agent(
		'gemini, thought only',
		3,
		flash,
		[gemini([{ text: ' thinking ', thought: true }])],
		{},
		withGoogle,
	),
	agent('gemini, no parts', 3.1, flash, [gemini([])], {}, withGoogle),
	agent(
		'gemini, function call, version 3.1',
		3.1,
		flash,
		[
			gemini([{ text: 'pre' }, { functionCall: { name: 'x', args: { a: 1 } } }]),
			gemini([{ text: 'after' }]),
		],
		{},
		withGoogle,
	),
	agent(
		'gemini, function call, version 2.2',
		2.2,
		flash,
		[gemini([{ functionCall: { name: 'x', args: { a: 1 } } }]), gemini([{ text: 'after' }])],
		{},
		withGoogle,
	),
	agent(
		'gemini, error output',
		3,
		flash,
		[geminiFailed(400), gemini([{ text: 'ok' }])],
		{},
		{
			...two,
			...withGoogle,
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

/** The Structured Output Parser sub-node (`outputParserStructured`) of a chain. */
function structuredParser(typeVersion: number, parameters: Record<string, unknown>): SubNodeCase {
	return {
		name: 'Parser',
		type: `${LC}outputParserStructured`,
		typeVersion,
		parameters,
		connection: 'ai_outputParser',
	};
}

const cityExample = structuredParser(1.3, {
	jsonSchemaExample: '{ "state": "California", "cities": ["Los Angeles", "San Diego"] }',
});
const personSchema = structuredParser(1.2, {
	schemaType: 'manual',
	inputSchema: JSON.stringify({
		type: 'object',
		properties: {
			name: { type: 'string', description: 'The name' },
			age: { type: 'integer' },
			tags: { type: 'array', items: { type: 'string' } },
		},
		required: ['name'],
	}),
});
const everyType = structuredParser(1.3, {
	schemaType: 'manual',
	inputSchema: JSON.stringify({
		type: 'object',
		properties: {
			score: { type: 'number' },
			active: { type: 'boolean' },
			nothing: { type: 'null' },
			mood: { type: 'string', enum: ['good', 'bad'] },
			inner: {
				type: 'object',
				properties: { id: { type: 'integer' } },
				additionalProperties: false,
			},
			map: { type: 'object' },
			free: {},
		},
		required: ['score', 'active', 'nothing', 'mood'],
		additionalProperties: true,
	}),
});
const texas = { output: { state: 'Texas', cities: ['Austin'] } };
const PARSER_FAILED = "Model output doesn't fit required format";
const PARSER_EMPTY = 'The AI model returned an empty response to the Structured Output Parser';

/** A chain with a model and a parser. */
function parsed(
	name: string,
	parser: SubNodeCase,
	responses: EquivalenceCase['responses'],
	extra: Partial<EquivalenceCase> = {},
): EquivalenceCase {
	const base = chain(`parser ${name}`, gpt, responses, { hasOutputParser: true }, extra);
	return { ...base, subNodes: [...(base.subNodes ?? []), parser] };
}

/** The Basic LLM Chain with the Structured Output Parser. */
const OUTPUT_PARSER_CASES: EquivalenceCase[] = [
	parsed(
		'from an example',
		cityExample,
		[
			completion(JSON.stringify(texas)),
			completion(`The answer:\n\`\`\`json\n${JSON.stringify({ ...texas, more: 1 })}\n\`\`\``),
		],
		two,
	),
	parsed(
		'from a schema, with messages',
		personSchema,
		[completion(JSON.stringify({ output: { age: 3, name: 'Ann', other: true } }))],
		{
			typeVersion: 1.7,
			parameters: { promptType: 'define', hasOutputParser: true, text: 'Who?', messages },
		},
	),
	parsed('without the output', personSchema, [completion('{"name":"Ann"}')], { typeVersion: 1.5 }),
	parsed(
		'with an output in the output',
		structuredParser(1.3, { jsonSchemaExample: '{"output":"x"}' }),
		[completion('{"output":{"output":"y"}}')],
	),
	parsed('answer that is not JSON', cityExample, [completion('Texas')], {
		expectedError: PARSER_FAILED,
	}),
	parsed(
		'answer of another type',
		cityExample,
		[completion('{"output":{"state":5,"cities":[]}}')],
		{
			typeVersion: 1.8,
			expectedError: PARSER_FAILED,
		},
	),
	parsed(
		'every type of the schema',
		everyType,
		[
			completion(
				JSON.stringify({
					output: {
						more: 'kept',
						free: [1],
						map: { k: 1 },
						inner: { id: 2 },
						mood: 'good',
						nothing: null,
						active: false,
						score: 1.5,
					},
				}),
			),
			completion('{"output":{"score":1,"active":true,"nothing":null,"mood":"sad"}}'),
			completion(
				'{"output":{"score":1,"active":true,"nothing":null,"mood":"bad","inner":{"x":1}}}',
			),
			completion('{"output":{"score":1,"active":true,"nothing":null,"mood":"bad","map":[]}}'),
			completion('{"output":{"score":1,"active":true,"nothing":null,"mood":"bad"}}'),
		],
		{
			items: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }],
			settings: { onError: 'continueRegularOutput' },
		},
	),
	parsed('empty answer', cityExample, [completion('{}')], { expectedError: PARSER_EMPTY }),
	parsed('answer without text', cityExample, [completion('')], {
		typeVersion: 1.6,
		expectedError: PARSER_EMPTY,
	}),
	parsed('continue', cityExample, [completion('no'), completion(JSON.stringify(texas))], {
		...two,
		settings: { onError: 'continueRegularOutput' },
	}),
	parsed('error output', cityExample, [completion(JSON.stringify(texas)), completion('{}')], {
		...two,
		settings: { onError: 'continueErrorOutput' },
	}),
	{
		...parsed('responses API', cityExample, [response(outputText(JSON.stringify(texas)))]),
		subNodes: [openAiModel(1.3, 'gpt-5-mini'), cityExample],
	},
	{
		...parsed('anthropic model', personSchema, [
			claude([claudeText('{"output":'), claudeText('{"name":"Ann"}}')]),
		]),
		...withAnthropic,
		subNodes: [sonnet, personSchema],
	},
	{
		...parsed('gemini model', cityExample, [gemini([{ text: JSON.stringify(texas) }])]),
		...withGoogle,
		subNodes: [flash, cityExample],
	},
];

/** The memory sub-node `memoryBufferWindow`. Each case has its own session key. */
function windowMemory(typeVersion: number, parameters: Record<string, unknown>): SubNodeCase {
	return {
		name: 'Memory',
		type: `${LC}memoryBufferWindow`,
		typeVersion,
		parameters,
		connection: 'ai_memory',
	};
}
const customKey = (key: unknown, extra: Record<string, unknown> = {}) =>
	windowMemory(1.3, { sessionIdType: 'customKey', sessionKey: key, ...extra });
const asked = { text: '={{ $json.q }}', options: { systemMessage: 'Be brief' } };
const questions = { items: [{ q: 'one' }, { q: 'two' }, { q: 'three' }] };

/** The Tools Agent with the window buffer memory, and no tools. */
const MEMORY_CASES: EquivalenceCase[] = [
	...[2, 2.1, 2.2, 3, 3.1].map((version) =>
		agent(
			`memory, version ${version}`,
			version,
			gpt,
			[completion('first'), completion('second'), completion('third')],
			asked,
			{ ...questions, subNodes: [gpt, customKey(`key-${version}`)] },
		),
	),
	agent(
		'memory, window of one exchange',
		3.1,
		gpt,
		[completion('first'), completion('second'), completion('third')],
		asked,
		{ ...questions, subNodes: [gpt, customKey('key-window', { contextWindowLength: 1 })] },
	),
	agent(
		'memory, responses',
		3.1,
		openAiModel(1.3, 'gpt-5', {}),
		[response(outputText('first')), response(outputText('second')), response(outputText('third'))],
		asked,
		{ ...questions, subNodes: [openAiModel(1.3, 'gpt-5', {}), customKey('key-responses')] },
	),
	agent(
		'memory, anthropic',
		3.1,
		sonnet,
		[claude([claudeText('first')]), claude([claudeText('second')]), claude([claudeText('third')])],
		asked,
		{
			...questions,
			...withAnthropic,
			subNodes: [sonnet, customKey('key-anthropic')],
		},
	),
	agent(
		'memory, gemini',
		3.1,
		flash,
		[gemini([{ text: 'first' }]), gemini([{ text: 'second' }]), gemini([{ text: 'third' }])],
		asked,
		{ ...questions, ...withGoogle, subNodes: [flash, customKey('key-gemini')] },
	),
	agent(
		'memory, key from the first item',
		3.1,
		gpt,
		[completion('first'), completion('second')],
		{ text: '={{ $json.q }}' },
		{
			items: [
				{ q: 'one', sid: 'key-item-a' },
				{ q: 'two', sid: 'key-item-b' },
			],
			subNodes: [gpt, customKey('={{ $json.sid }}')],
		},
	),
	agent(
		'memory, version 1.1 of the memory',
		2.2,
		gpt,
		[completion('first'), completion('second')],
		{ text: '={{ $json.q }}' },
		{
			items: [
				{ q: 'one', sessionId: 'key-old' },
				{ q: 'two', sessionId: 'key-other' },
			],
			subNodes: [gpt, windowMemory(1.1, {})],
		},
	),
	agent(
		'memory, version 1 of the memory',
		3,
		gpt,
		[completion('first'), completion('second')],
		{ text: '={{ $json.q }}' },
		{
			items: [{ q: 'one' }, { q: 'two' }],
			subNodes: [gpt, windowMemory(1, { sessionKey: 'key-v1' })],
		},
	),
	agent(
		'memory, empty key',
		3.1,
		gpt,
		[completion('first')],
		{},
		{
			subNodes: [gpt, customKey('={{ $json.none }}')],
			expectedError: 'Error in sub-node Memory',
		},
	),
	agent(
		'memory, empty key, version 2.2',
		2.2,
		gpt,
		[completion('first')],
		{},
		{
			subNodes: [gpt, customKey('')],
			expectedError: 'Error in sub-node Memory',
		},
	),
	agent(
		'memory, number as key',
		3.1,
		gpt,
		[completion('first'), completion('second')],
		{ text: '={{ $json.q }}' },
		{ items: [{ q: 'one' }, { q: 'two' }], subNodes: [gpt, customKey('={{ 4711 }}')] },
	),
	agent(
		'memory, failed call is not kept',
		3.1,
		gpt,
		[failed(400), completion('second'), completion('third')],
		asked,
		{
			...questions,
			settings: { onError: 'continueRegularOutput' },
			subNodes: [gpt, customKey('key-failed')],
		},
	),
	agent(
		'memory, failed call is not kept, version 2.2',
		2.2,
		gpt,
		[completion('first'), failed(400), completion('third')],
		asked,
		{
			...questions,
			settings: { onError: 'continueRegularOutput' },
			subNodes: [gpt, customKey('key-failed-2')],
		},
	),
	agent('memory, empty answer', 3.1, gpt, [completion(''), completion('second')], asked, {
		...questions,
		items: questions.items.slice(0, 2),
		subNodes: [gpt, customKey('key-empty')],
	}),
	agent(
		'memory, empty answer, version 2.2',
		2.2,
		gpt,
		[completion(''), completion('second')],
		asked,
		{ ...questions, items: questions.items.slice(0, 2), subNodes: [gpt, customKey('key-empty-2')] },
	),
	agent(
		'memory, tool call without tools',
		3.1,
		gpt,
		[completion('first'), toolCall(), completion('again one'), completion('again two')],
		asked,
		{ ...questions, items: questions.items.slice(0, 2), subNodes: [gpt, customKey('key-tool')] },
	),
	agent(
		'memory, tool call without tools, version 2.2',
		2.2,
		gpt,
		[toolCall(), completion('after'), completion('second')],
		asked,
		{ ...questions, items: questions.items.slice(0, 2), subNodes: [gpt, customKey('key-tool-2')] },
	),
	agent(
		'memory, object as key',
		3.1,
		gpt,
		[completion('first')],
		{},
		{
			subNodes: [gpt, customKey('={{ $json }}')],
			expectedError: 'Error in sub-node Memory',
		},
	),
	agent(
		'memory, no prompt',
		3.1,
		gpt,
		[completion('first')],
		{ text: '={{ $json.none }}' },
		{
			subNodes: [gpt, customKey('key-no-prompt')],
			expectedError: 'No prompt specified',
		},
	),
	agent(
		'memory, no prompt, version 2.2',
		2.2,
		gpt,
		[completion('first')],
		{ text: '={{ $json.none }}' },
		{
			subNodes: [gpt, customKey('key-no-prompt-2')],
			expectedError: 'No prompt specified',
		},
	),
	agent(
		'memory, max iterations, version 2.2',
		2.2,
		gpt,
		[toolCall(), completion('second')],
		{ ...asked, options: { systemMessage: 'Be brief', maxIterations: 1 } },
		{ ...questions, items: questions.items.slice(0, 2), subNodes: [gpt, customKey('key-max-2')] },
	),
	agent(
		'memory, max iterations',
		3.1,
		gpt,
		[completion('first'), toolCall(), completion('x'), completion('y')],
		{ ...asked, options: { systemMessage: 'Be brief', maxIterations: 1 } },
		{
			...questions,
			items: questions.items.slice(0, 2),
			subNodes: [gpt, customKey('key-max')],
			expectedError:
				'Max iterations (1) reached. The agent could not complete the task within the allowed number of iterations.',
		},
	),
	agent(
		'memory, empty answer, anthropic, version 2.2',
		2.2,
		sonnet,
		[claude([claudeText('')]), claude([claudeText('second')])],
		asked,
		{
			...questions,
			items: questions.items.slice(0, 2),
			...withAnthropic,
			subNodes: [sonnet, customKey('key-empty-anthropic')],
		},
	),
	agent(
		'memory, empty answer, gemini, version 2.2',
		2.2,
		flash,
		[gemini([{ text: '' }]), gemini([{ text: 'second' }])],
		asked,
		{
			...questions,
			items: questions.items.slice(0, 2),
			...withGoogle,
			subNodes: [flash, customKey('key-empty-gemini')],
		},
	),
	agent(
		'memory, retry',
		3.1,
		gpt,
		[completion('first'), failed(400), completion('again one'), completion('again two')],
		asked,
		{
			...questions,
			items: questions.items.slice(0, 2),
			settings: retry,
			subNodes: [gpt, customKey('key-retry')],
		},
	),
];

/** The model calls the tool `name` with the arguments. */
const callsTool = (name: string, args: Record<string, unknown>, id = 'call_1') => ({
	body: {
		id: 'chatcmpl-1',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content: null,
					tool_calls: [
						{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } },
					],
				},
				finish_reason: 'tool_calls',
			},
		],
	},
});
const httpTool: SubNodeCase = {
	name: 'Fetch page',
	type: 'n8n-nodes-base.httpRequestTool',
	typeVersion: 4.2,
	parameters: {
		toolDescription: 'Gets a page',
		url: "={{ $fromAI('url', 'The address of the page', 'string') }}",
		options: {},
	},
	connection: 'ai_tool',
};
/**
 * The Tools Agent with the HTTP Request tool: the function schema, the request of the tool,
 * the messages of the call and of its result, and the intermediate steps.
 */
export const TOOL_PROBE_CASES: EquivalenceCase[] = [2.2, 3.1].map((version) =>
	agent(
		`tool probe http ${version}`,
		version,
		gpt,
		[
			callsTool('Fetch_page', { url: 'https://example.com/a' }),
			{ body: { title: 'A page' } },
			completion('The title is A page'),
		],
		{ options: { systemMessage: 'Be brief', returnIntermediateSteps: version >= 3 } },
		{ subNodes: [gpt, httpTool], responseBytes: true },
	),
);

/** A Chat Completions answer that calls tools: `[name, arguments, id]` for each call. */
const callsTools = (calls: Array<[string, unknown, string]>, content: string | null = null) => ({
	body: {
		id: 'chatcmpl-1',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content,
					tool_calls: calls.map(([name, args, id]) => ({
						id,
						type: 'function',
						function: {
							name,
							arguments: typeof args === 'string' ? args : JSON.stringify(args),
						},
					})),
				},
				finish_reason: 'tool_calls',
			},
		],
	},
});
const typedTool: SubNodeCase = {
	name: 'Read list',
	type: 'n8n-nodes-base.httpRequestTool',
	typeVersion: 4.2,
	parameters: {
		toolDescription: 'Reads a page of a list',
		url: 'https://example.com/list',
		sendQuery: true,
		queryParameters: {
			parameters: [
				{ name: 'page', value: "={{ $fromAI('page', 'The page number', 'number', 1) }}" },
				{ name: 'all', value: "={{ $fromAI('all', '', 'boolean') }}" },
				{
					name: 'q',
					value: "=x {{ $fromAI('q') }} {{ $fromAI('page', 'The page number', 'number', 1) }}",
				},
			],
		},
		options: {},
	},
	connection: 'ai_tool',
};
const httpToolWith = (name: string, parameters: Record<string, unknown>): SubNodeCase => ({
	name,
	type: 'n8n-nodes-base.httpRequestTool',
	typeVersion: 4.2,
	parameters: { toolDescription: 'Reads data', options: {}, ...parameters },
	connection: 'ai_tool',
});
/** A tool without arguments, a tool whose arguments all have a default, and a JSON argument. */
const fixedTool = httpToolWith('Fixed.tool (1)', { url: 'https://example.com/fixed' });
const defaultsTool = httpToolWith('Defaults', {
	sendQuery: true,
	queryParameters: {
		parameters: [{ name: 'verb', value: "={{ $fromAI('verb', 'GET or POST', 'string', 'GET') }}" }],
	},
	url: "=https://example.com/{{ $fromAI('strict', '', 'boolean', false) }}/{{ $fromAI('count', ' padded ', 'number', 2) }}",
});
const jsonTool = httpToolWith('Send', {
	method: 'POST',
	url: 'https://example.com/send',
	sendBody: true,
	specifyBody: 'json',
	jsonBody: "={{ $fromAI('payload', 'The body', 'json') }}",
});
const page = (title: string) => ({ body: { title } });
const withTools = (tools: SubNodeCase[], extra: Partial<EquivalenceCase> = {}) => ({
	subNodes: [gpt, ...tools],
	responseBytes: true,
	...extra,
});
const brief = (version: number, options: Record<string, unknown> = {}) => ({
	options: { systemMessage: 'Be brief', returnIntermediateSteps: version >= 3, ...options },
});
const fetchA = callsTools([['Fetch_page', { url: 'https://example.com/a' }, 'call_1']]);
const fetchB = callsTools([['Fetch_page', { url: 'https://example.com/b' }, 'call_2']]);

const BAD_FORMAT = "Model output doesn't fit required format";
const BAD_INPUT = 'Received tool input did not match expected schema\n\n';
const MAX_ONE =
	'Max iterations (1) reached. The agent could not complete the task within the allowed number of iterations.';
const EMPTY_JSON = '✖ Value must be a non-empty object or a non-empty array\n  → at payload';
/** The error of v1 for each case that fails. */
const TOOL_ERRORS: Record<string, string> = {
	'agent tools 2.2, argument of another type': `${BAD_INPUT}✖ Expected number, received string\n  → at page\n✖ Expected boolean, received string\n  → at all\n✖ Expected string, received number\n  → at q`,
	'agent tools 2.2, missing argument': `${BAD_INPUT}✖ Required\n  → at all\n✖ Required\n  → at q`,
	'agent tools 2.2, arguments that are not JSON': BAD_FORMAT,
	'agent tools 3.1, arguments that are not JSON': BAD_FORMAT,
	'agent tools 2.2, empty arguments text': BAD_FORMAT,
	'agent tools 3.1, empty arguments text': BAD_FORMAT,
	'agent tools 2.2, calls that are not JSON, with text': BAD_FORMAT,
	'agent tools 3.1, calls that are not JSON, with text': BAD_FORMAT,
	'agent tools 3.1, max iterations': MAX_ONE,
	'agent tools 2.2, JSON argument': BAD_INPUT + EMPTY_JSON,
	'agent tools 2.2, JSON argument that is missing': BAD_INPUT + EMPTY_JSON,
	'agent tools 2.2, arguments that are a list': `${BAD_INPUT}✖ Expected object, received array`,
	'agent tools 2.2, a good call and a call with a wrong argument': `${BAD_INPUT}✖ Expected string, received number\n  → at url`,
	'agent tools 2.2, arguments that are 5': `${BAD_INPUT}✖ Expected object, received number`,
	'agent tools 2.2, arguments that are "text"': `${BAD_INPUT}✖ Expected object, received string`,
	'agent tools 2.2, arguments that are null': `${BAD_INPUT}✖ Expected object, received null`,
	'agent tools 2.2, arguments that are true': `${BAD_INPUT}✖ Expected object, received boolean`,
	'agent tools 3.1, arguments that are null':
		"Cannot destructure property 'id' of 'toolInput' as it is null.",
};

/**
 * The Tools Agent with tools, native: the converter writes the loop, and each tool call is a
 * step of the tool node (`docs/compiler-plan.md`, "Tools").
 */
const ALL_TOOL_CASES: EquivalenceCase[] = [
	...[2.2, 3.1].flatMap((version) => toolCases(version)),
	...[2, 2.1, 3].map((version) => twoRounds(version)),
	...uncheckedCases(),
].map((c) => (c.name in TOOL_ERRORS ? { ...c, expectedError: TOOL_ERRORS[c.name] } : c));

/**
 * Cases that stay in the fallback host: a JSON body from an argument on an agent of version
 * 3. That agent does not check the arguments, and the HTTP Request library node has no form
 * of the v1 error "The value in the "JSON Body" field is not valid JSON". The recordings
 * stay as the facts of v1.
 */
const TOOL_INPUT_GAPS = [
	'agent tools 3.1, JSON argument',
	'agent tools 3.1, JSON argument that is missing',
];
export const TOOL_PENDING_CASES = ALL_TOOL_CASES.filter((c) => TOOL_INPUT_GAPS.includes(c.name));
export const TOOL_CASES = ALL_TOOL_CASES.filter((c) => !TOOL_INPUT_GAPS.includes(c.name));

function twoRounds(version: number): EquivalenceCase {
	return agent(
		`tools ${version}, two rounds`,
		version,
		gpt,
		[fetchA, page('A'), fetchB, page('B'), completion('A and B')],
		brief(version),
		withTools([httpTool]),
	);
}

/** Version 3 does not check the arguments: values of every JSON type reach the tool node. */
function uncheckedCases(): EquivalenceCase[] {
	return [
		agent(
			'tools 3.1, query arguments of every type',
			3.1,
			gpt,
			[
				callsTools([
					['Read_list', { page: null, all: [1, 2], q: { a: 1 } }, 'call_1'],
					['Read_list', { page: 1.5, all: null, q: ['x', 'y'] }, 'call_2'],
				]),
				page('L'),
				page('M'),
				completion('Done'),
			],
			brief(3.1),
			withTools([typedTool]),
		),
		agent(
			'tools 3.1, URL arguments of every type',
			3.1,
			gpt,
			[
				callsTools([
					['Fetch_page', { url: null }, 'call_1'],
					['Fetch_page', { url: { a: 1 } }, 'call_2'],
					['Fetch_page', {}, 'call_3'],
					['Fetch_page', { url: true }, 'call_4'],
				]),
				completion('Done'),
			],
			brief(3.1),
			withTools([httpTool]),
		),
		agent(
			'tools 3.1, URL parts of every type',
			3.1,
			gpt,
			[
				callsTools([
					['Defaults', { strict: null, count: { a: 1 }, verb: 5 }, 'call_1'],
					['Defaults', { strict: [1], count: 'x y', verb: true }, 'call_2'],
				]),
				page('L'),
				page('M'),
				completion('Done'),
			],
			brief(3.1),
			withTools([defaultsTool]),
		),
	];
}

function toolCases(version: number): EquivalenceCase[] {
	return [
		agent(
			`tools ${version}, three tools`,
			version,
			gpt,
			[
				callsTools([
					['Fixed_tool_1_', {}, 'call_1'],
					['Read_list', { all: true, q: 'a' }, 'call_2'],
					['Fetch_page', { url: 'https://example.com/a' }, 'call_3'],
				]),
				// Before version 3 the tools run together: the answers are the same, so the
				// order of their requests does not show in the messages.
				page('P'),
				page('P'),
				page('P'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool, typedTool, fixedTool]),
		),
		...['5', '"text"', 'null', 'true'].map((text) =>
			agent(
				`tools ${version}, arguments that are ${text}`,
				version,
				gpt,
				[callsTools([['Fixed_tool_1_', text, 'call_1']]), page('F'), completion('Done')],
				brief(version),
				withTools([fixedTool]),
			),
		),
		agent(
			`tools ${version}, tool without arguments gives a file`,
			version,
			gpt,
			[
				callsTools([['Fixed_tool_1_', {}, 'call_1']]),
				{ headers: { 'content-type': 'image/png' }, body: 'PNGDATA' },
				completion('Done'),
			],
			brief(version),
			withTools([fixedTool]),
		),
		agent(
			`tools ${version}, tool gives a file`,
			version,
			gpt,
			[fetchA, { headers: { 'content-type': 'image/png' }, body: 'PNGDATA' }, completion('Done')],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, two rounds`,
			version,
			gpt,
			[fetchA, page('A'), fetchB, page('B'), completion('A and B')],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, two calls in one answer, with text`,
			version,
			gpt,
			[
				callsTools(
					[
						['Fetch_page', { url: 'https://example.com/a' }, 'call_1'],
						['Read_list', { page: 2, all: true, q: 'cats' }, 'call_2'],
					],
					'I look at both',
				),
				page('A'),
				page('L'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool, typedTool]),
		),
		agent(
			`tools ${version}, default argument`,
			version,
			gpt,
			[
				callsTools([['Read_list', { all: false, q: 'dogs' }, 'call_1']]),
				page('L'),
				completion('Done'),
			],
			brief(version),
			withTools([typedTool]),
		),
		agent(
			`tools ${version}, argument of another type`,
			version,
			gpt,
			[
				callsTools([['Read_list', { page: '3', all: 'yes', q: 5 }, 'call_1']]),
				page('L'),
				completion('Done'),
			],
			brief(version),
			withTools([typedTool]),
		),
		agent(
			`tools ${version}, missing argument`,
			version,
			gpt,
			[callsTools([['Read_list', { page: 3 }, 'call_1']]), page('L'), completion('Done')],
			brief(version),
			withTools([typedTool]),
		),
		agent(
			`tools ${version}, extra arguments`,
			version,
			gpt,
			[
				callsTools([
					[
						'Fetch_page',
						{ url: 'https://example.com/a', id: 7, log: 'L', type: 'T', more: 1 },
						'call_1',
					],
				]),
				page('A'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, arguments that are not JSON`,
			version,
			gpt,
			[callsTools([['Fetch_page', '{ url: ', 'call_1']]), page('A'), completion('Done')],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, unknown tool`,
			version,
			gpt,
			[callsTools([['Other', { a: 1 }, 'call_1']]), completion('Done'), completion('More')],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, tool fails`,
			version,
			gpt,
			[fetchA, { status: 500, body: { message: 'broken' } }, completion('It failed')],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, max iterations`,
			version,
			gpt,
			[fetchA, page('A'), fetchB, page('B'), completion('late')],
			brief(version, { maxIterations: 1 }),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, two items`,
			version,
			gpt,
			version >= 3
				? [fetchA, completion('two'), page('A'), completion('one'), completion('two again')]
				: [fetchA, page('A'), completion('one'), completion('two')],
			{ text: '={{ $json.q }}', ...brief(version) },
			withTools([httpTool], { items: [{ q: 'one' }, { q: 'two' }] }),
		),
		agent(
			`tools ${version}, no arguments and default arguments`,
			version,
			gpt,
			[
				callsTools([
					['Fixed_tool_1_', {}, 'call_1'],
					['Defaults', {}, 'call_2'],
					['Defaults', { verb: 'POST', strict: true, count: 5 }, 'call_3'],
				]),
				page('F'),
				page('D'),
				page('E'),
				completion('Done'),
			],
			brief(version),
			withTools([fixedTool, defaultsTool]),
		),
		agent(
			`tools ${version}, JSON argument`,
			version,
			gpt,
			[
				callsTools([['Send', { payload: { a: [1, 2] } }, 'call_1']]),
				page('S'),
				callsTools([['Send', { payload: {} }, 'call_2']]),
				page('T'),
				completion('Done'),
			],
			brief(version),
			withTools([jsonTool]),
		),
		agent(
			`tools ${version}, first of two calls fails`,
			version,
			gpt,
			[
				callsTools([
					['Fetch_page', { url: 'https://example.com/a' }, 'call_1'],
					['Fetch_page', { url: 'https://example.com/b' }, 'call_2'],
				]),
				{ status: 404, body: { message: 'gone' } },
				page('B'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, one call of two is not JSON`,
			version,
			gpt,
			[
				callsTools([
					['Fetch_page', { url: 'https://example.com/a' }, 'call_1'],
					['Fetch_page', '{ url: ', 'call_2'],
				]),
				page('A'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, empty arguments text`,
			version,
			gpt,
			[callsTools([['Fixed_tool_1_', '', 'call_1']]), page('F'), completion('Done')],
			brief(version),
			withTools([fixedTool]),
		),
		agent(
			`tools ${version}, arguments that are a list`,
			version,
			gpt,
			[callsTools([['Fixed_tool_1_', '[1]', 'call_1']]), page('F'), completion('Done')],
			brief(version),
			withTools([fixedTool]),
		),
		agent(
			`tools ${version}, a good call and a call with a wrong argument`,
			version,
			gpt,
			[
				callsTools([
					['Fetch_page', { url: 'https://example.com/a' }, 'call_1'],
					['Fetch_page', { url: 7 }, 'call_2'],
					['Fetch_page', { url: 'https://example.com/c' }, 'call_3'],
				]),
				page('A'),
				page('C'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, JSON argument that is missing`,
			version,
			gpt,
			[callsTools([['Send', { other: 1 }, 'call_1']]), completion('Done')],
			brief(version),
			withTools([jsonTool]),
		),
		agent(
			`tools ${version}, calls that are not JSON, with text`,
			version,
			gpt,
			[
				callsTools([['Fetch_page', '{ url: ', 'call_1']], 'Some text'),
				page('A'),
				completion('Done'),
			],
			brief(version),
			withTools([httpTool]),
		),
		agent(
			`tools ${version}, without steps and system message`,
			version,
			gpt,
			[fetchA, page('A'), completion('Done')],
			{},
			withTools([httpTool]),
		),
	];
}

/** Every case that runs in the engine of n8n and through the converter. */
export const ENGINE_CASES: EquivalenceCase[] = [
	...OUTPUT_PARSER_CASES,
	...AI_ENGINE_CASES,
	...AGENT_ENGINE_CASES,
	...PROMPT_SOURCE_CASES,
	...ANTHROPIC_MODEL_CASES,
	...GEMINI_MODEL_CASES,
	...TOOL_CALL_CASES,
	...NETWORK_CASES,
	...OPEN_ROUTER_CASES,
	...MEMORY_CASES,
	...TOOL_PROBE_CASES,
	...TOOL_CASES,
];

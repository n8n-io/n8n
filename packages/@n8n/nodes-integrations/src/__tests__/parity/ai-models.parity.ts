import { promptModel } from '@n8n/nodes-core';
import type { ICredentialType, INodeType } from 'n8n-workflow';

import { anthropicChatModel } from '../../nodes/anthropic/actions/chat-model';
import { geminiChatModel } from '../../nodes/google-gemini/actions/chat-model';
import { minimaxChatModel } from '../../nodes/minimax/actions/chat-model';
import { generateImage } from '../../nodes/open-ai/actions/image.generate';
import { messageOpenAi } from '../../nodes/open-ai/actions/text.message';
import { xAiChatModel } from '../../nodes/x-ai/actions/chat-model';
import {
	actionNode,
	compareRuns,
	requireBuilt,
	runNode,
	type AllowedDifference,
	type NodeUnderTest,
	type ParityCase,
	type SubnodeUnderTest,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const built = <T>(file: string) => requireBuilt(`@n8n/nodes-langchain/dist/${file}`) as T;

const { ChainLlm } = built<{ ChainLlm: new () => INodeType }>(
	'nodes/chains/ChainLLM/ChainLlm.node.js',
);
const { LmChatGoogleGemini } = built<{ LmChatGoogleGemini: new () => INodeType }>(
	'nodes/llms/LmChatGoogleGemini/LmChatGoogleGemini.node.js',
);
const { LmChatAnthropic } = built<{ LmChatAnthropic: new () => INodeType }>(
	'nodes/llms/LMChatAnthropic/LmChatAnthropic.node.js',
);
const { OpenAi } = built<{ OpenAi: new () => INodeType }>('nodes/vendors/OpenAi/OpenAi.node.js');
const { GooglePalmApi } = built<{ GooglePalmApi: new () => ICredentialType }>(
	'credentials/GooglePalmApi.credentials.js',
);
const { AnthropicApi } = built<{ AnthropicApi: new () => ICredentialType }>(
	'credentials/AnthropicApi.credentials.js',
);
const { OpenAiApi } = requireBuilt('nodes-base/dist/credentials/OpenAiApi.credentials.js') as {
	OpenAiApi: new () => ICredentialType;
};

const input = [{ question: 'Say hello' }, { question: 'Say bye' }];

/** A Basic LLM Chain with a system message, and the same as `ai.prompt`. */
const chainOf = (model: SubnodeUnderTest): NodeUnderTest => ({
	nodeType: new ChainLlm(),
	type: '@n8n/n8n-nodes-langchain.chainLlm',
	typeVersion: 1.9,
	parameters: {
		promptType: 'define',
		text: '={{ $json.question }}',
		messages: {
			messageValues: [{ type: 'SystemMessagePromptTemplate', message: 'Answer in one word' }],
		},
	},
	subnodes: [model],
});

const promptOf = (model: SubnodeUnderTest): NodeUnderTest => ({
	...actionNode(promptModel, { prompt: '={{ $json.question }}', system: 'Answer in one word' }),
	subnodes: [model],
});

const model = (node: NodeUnderTest): SubnodeUnderTest => ({
	...node,
	name: 'Model',
	connection: 'ai_languageModel',
});

const forBoth = (paths: readonly string[], reason: string): AllowedDifference[] =>
	[0, 1].flatMap((index) =>
		paths.map((path) => ({
			path: path.replace('#i', `#${index}`),
			kind: 'intended' as const,
			reason,
		})),
	);

describe('googleGemini.chatModel parity with Google Gemini Chat Model v1.2', () => {
	const URL =
		'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
	const parityCase: ParityCase = {
		credential: {
			data: { host: 'https://generativelanguage.googleapis.com', apiKey: 'key-parity' },
			types: [new GooglePalmApi()],
		},
		input,
		routes: [
			{
				method: 'POST',
				url: URL,
				json: {
					candidates: [
						{
							content: { parts: [{ text: 'Hello' }], role: 'model' },
							finishReason: 'STOP',
							index: 0,
						},
					],
					usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1, totalTokenCount: 5 },
				},
			},
		],
		headers: ['content-type', 'x-goog-api-key'],
	};

	const ALLOWED: readonly AllowedDifference[] = [
		...forBoth(
			[`requests.POST ${URL} #i.query.key`, `requests.POST ${URL} #i.headers.x-goog-api-key`],
			'The legacy SDK sends the key as a header; the googlePalmApi credential puts it in the query.',
		),
		...forBoth(
			[`requests.POST ${URL} #i.body.generationConfig.stopSequences`],
			'The action sends no stop sequences; the legacy SDK sends an empty list.',
		),
		...forBoth(
			[
				`requests.POST ${URL} #i.body.systemInstruction.role`,
				`requests.POST ${URL} #i.body.safetySettings`,
			],
			'The action leaves out the role of the system instruction and the empty safety settings.',
		),
	];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			chainOf(
				model({
					nodeType: new LmChatGoogleGemini(),
					type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					typeVersion: 1.2,
					credential: 'googlePalmApi',
					parameters: { modelName: 'models/gemini-2.5-flash', options: { temperature: 0.2 } },
				}),
			),
			parityCase,
		);
		const next = await runNode(
			promptOf(
				model(
					actionNode(
						geminiChatModel,
						{ model: 'gemini-2.5-flash', temperature: 0.2 },
						'googlePalmApi',
					),
				),
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('anthropic.chatModel parity with Anthropic Chat Model v1.6', () => {
	const URL = 'https://api.anthropic.com/v1/messages';
	const parityCase: ParityCase = {
		credential: {
			data: { apiKey: 'key-parity', url: 'https://api.anthropic.com' },
			types: [new AnthropicApi()],
		},
		input,
		routes: [
			{
				method: 'POST',
				url: URL,
				json: {
					id: 'msg_1',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-5',
					content: [{ type: 'text', text: 'Hello' }],
					stop_reason: 'end_turn',
					usage: { input_tokens: 10, output_tokens: 1 },
				},
			},
		],
		headers: ['content-type', 'x-api-key', 'anthropic-version'],
	};

	const ALLOWED = forBoth(
		[`requests.POST ${URL} #i.body.stream`],
		'The action leaves out stream: false, the API default.',
	);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			chainOf(
				model({
					nodeType: new LmChatAnthropic(),
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					typeVersion: 1.6,
					credential: 'anthropicApi',
					parameters: {
						model: { __rl: true, mode: 'id', value: 'claude-sonnet-4-5' },
						options: { temperature: 0.2, maxTokensToSample: 1024 },
					},
				}),
			),
			parityCase,
		);
		const next = await runNode(
			promptOf(
				model(
					actionNode(
						anthropicChatModel,
						{ model: 'claude-sonnet-4-5', temperature: 0.2, maxTokens: 1024 },
						'anthropicApi',
					),
				),
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('openAi.image.generate parity with OpenAI v2.3 image generate', () => {
	const URL = 'https://api.openai.com/v1/images/generations';
	// A 1x1 PNG, so the legacy node detects its type from the bytes.
	const png =
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
	const parityCase: ParityCase = {
		credential: {
			data: { apiKey: 'key-parity', url: 'https://api.openai.com/v1' },
			types: [new OpenAiApi()],
		},
		input: [{ prompt: 'A red hiking backpack on a white background' }],
		routes: [{ method: 'POST', url: URL, json: { created: 1, data: [{ b64_json: png }] } }],
	};

	const ALLOWED: readonly AllowedDifference[] = [
		'mimeType',
		'fileType',
		'fileName',
		'fileExtension',
		'fileSize',
		'bytes',
	].map((field) => ({
		path: `items[0].json.${field}`,
		kind: 'intended',
		reason: 'The item JSON holds the output fields only; the file details stay in binary.data.',
	}));

	it('sends the same request and emits the same image', async () => {
		const legacy = await runNode(
			{
				nodeType: new OpenAi(),
				type: '@n8n/n8n-nodes-langchain.openAi',
				typeVersion: 2.3,
				credential: 'openAiApi',
				parameters: {
					resource: 'image',
					operation: 'generate',
					modelId: { __rl: true, mode: 'id', value: 'gpt-image-1' },
					prompt: '={{ $json.prompt }}',
					options: { size: '1024x1024', quality: 'high' },
				},
			},
			parityCase,
		);
		const next = await runNode(
			actionNode(
				generateImage,
				{ model: 'gpt-image-1', prompt: '={{ $json.prompt }}', size: '1024x1024', quality: 'high' },
				'openAiApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(1);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const { LmChatMinimax } = built<{ LmChatMinimax: new () => INodeType }>(
	'nodes/llms/LmChatMinimax/LmChatMinimax.node.js',
);
const { LmChatXAiGrok } = built<{ LmChatXAiGrok: new () => INodeType }>(
	'nodes/llms/LmChatXAiGrok/LmChatXAiGrok.node.js',
);
const { MinimaxApi } = built<{ MinimaxApi: new () => ICredentialType }>(
	'credentials/MinimaxApi.credentials.js',
);
const { XAiApi } = built<{ XAiApi: new () => ICredentialType }>(
	'credentials/XAiApi.credentials.js',
);

const completion = {
	id: 'chatcmpl-1',
	object: 'chat.completion',
	choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
	usage: { prompt_tokens: 9, completion_tokens: 1, total_tokens: 10 },
};

describe('minimax.chatModel parity with MiniMax Chat Model v1.2', () => {
	const URL = 'https://api.minimax.io/v1/chat/completions';
	const parityCase: ParityCase = {
		credential: {
			data: { apiKey: 'key-parity', region: 'international', url: 'https://api.minimax.io/v1' },
			types: [new MinimaxApi()],
		},
		input,
		routes: [{ method: 'POST', url: URL, json: completion }],
	};

	const ALLOWED = forBoth(
		[`requests.POST ${URL} #i.body.stream`],
		'The action leaves out stream: false, the API default.',
	);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			chainOf(
				model({
					nodeType: new LmChatMinimax(),
					type: '@n8n/n8n-nodes-langchain.lmChatMinimax',
					typeVersion: 1.2,
					credential: 'minimaxApi',
					parameters: {
						model: { __rl: true, mode: 'id', value: 'MiniMax-M2' },
						options: { maxTokens: 512 },
					},
				}),
			),
			parityCase,
		);
		const next = await runNode(
			promptOf(
				model(actionNode(minimaxChatModel, { model: 'MiniMax-M2', maxTokens: 512 }, 'minimaxApi')),
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('xAi.chatModel parity with xAI Grok Chat Model v1', () => {
	const URL = 'https://api.x.ai/v1/chat/completions';
	const parityCase: ParityCase = {
		credential: {
			data: { apiKey: 'key-parity', url: 'https://api.x.ai/v1' },
			types: [new XAiApi()],
		},
		input,
		routes: [{ method: 'POST', url: URL, json: completion }],
	};

	const ALLOWED = forBoth(
		[`requests.POST ${URL} #i.body.stream`],
		'The action leaves out stream: false, the API default.',
	);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			chainOf(
				model({
					nodeType: new LmChatXAiGrok(),
					type: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
					typeVersion: 1,
					credential: 'xAiApi',
					parameters: { model: 'grok-4', options: { maxTokens: 512 } },
				}),
			),
			parityCase,
		);
		const next = await runNode(
			promptOf(model(actionNode(xAiChatModel, { model: 'grok-4', maxTokens: 512 }, 'xAiApi'))),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('openAi.text.message parity with OpenAI v1.8 text message', () => {
	const URL = 'https://api.openai.com/v1/chat/completions';
	const parityCase: ParityCase = {
		credential: {
			data: { apiKey: 'key-parity', url: 'https://api.openai.com/v1' },
			types: [new OpenAiApi()],
		},
		input,
		routes: [{ method: 'POST', url: URL, json: completion }],
	};

	// The legacy item is the choice envelope; a builder often passes it on instead of its text.
	const ALLOWED: readonly AllowedDifference[] = [0, 1].flatMap((index) =>
		['index', 'message', 'finish_reason', 'text'].map((field) => ({
			path: `items[${index}].json.${field}`,
			kind: 'intended' as const,
			reason: 'Every ai-style action gives the reply as `text`, not the provider choice envelope.',
		})),
	);

	it('sends the same requests and emits the reply text', async () => {
		const legacy = await runNode(
			{
				nodeType: new OpenAi(),
				type: '@n8n/n8n-nodes-langchain.openAi',
				typeVersion: 1.8,
				credential: 'openAiApi',
				parameters: {
					resource: 'text',
					operation: 'message',
					modelId: { __rl: true, mode: 'id', value: 'gpt-5-mini' },
					messages: {
						values: [
							{ role: 'system', content: 'Answer in one word' },
							{ content: '={{ $json.question }}' },
						],
					},
					options: { maxTokens: 64 },
				},
			},
			parityCase,
		);
		const next = await runNode(
			actionNode(
				messageOpenAi,
				{
					model: 'gpt-5-mini',
					prompt: '={{ $json.question }}',
					system: 'Answer in one word',
					maxTokens: 64,
				},
				'openAiApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(next.items.map(({ json }) => json)).toEqual([{ text: 'Hello' }, { text: 'Hello' }]);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

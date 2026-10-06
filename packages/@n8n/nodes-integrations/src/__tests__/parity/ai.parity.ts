import { classifyText, promptModel, runAgent } from '@n8n/nodes-core';
import type { ICredentialType, INodeType } from 'n8n-workflow';

import { openAiChatModel } from '../../nodes/open-ai/actions/chat-model';
import {
	actionNode,
	compareRuns,
	requireBuilt,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type SubnodeUnderTest,
} from '../../../../nodes-core/src/__tests__/parity/harness';

// The legacy nodes ship in nodes-langchain, which this package does not depend on.
const { ChainLlm } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/chains/ChainLLM/ChainLlm.node.js',
) as { ChainLlm: new () => INodeType };
const { LmChatOpenAi } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/llms/LMChatOpenAi/LmChatOpenAi.node.js',
) as { LmChatOpenAi: new () => INodeType };
const { OpenAiApi } = requireBuilt('nodes-base/dist/credentials/OpenAiApi.credentials.js') as {
	OpenAiApi: new () => ICredentialType;
};

const COMPLETIONS = 'https://api.openai.com/v1/chat/completions';

const completion = (content: string) => ({
	id: 'chatcmpl-1',
	object: 'chat.completion',
	created: 1,
	model: 'gpt-5-mini',
	choices: [
		{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop', logprobs: null },
	],
	usage: { prompt_tokens: 9, completion_tokens: 2, total_tokens: 11 },
});

const openAiCase = (routes: ParityCase['routes']): ParityCase => ({
	credential: {
		data: { apiKey: 'key-parity', url: 'https://api.openai.com/v1' },
		types: [new OpenAiApi()],
	},
	input: [{ question: 'Say hello' }, { question: 'Say bye' }],
	routes,
});

const legacyModel: SubnodeUnderTest = {
	name: 'Model',
	connection: 'ai_languageModel',
	nodeType: new LmChatOpenAi(),
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	typeVersion: 1.3,
	credential: 'openAiApi',
	parameters: {
		model: { __rl: true, mode: 'list', value: 'gpt-5-mini' },
		responsesApiEnabled: false,
		options: { temperature: 0.2, maxTokens: 64 },
	},
};

const nextModel: SubnodeUnderTest = {
	...actionNode(
		openAiChatModel,
		{ model: 'gpt-5-mini', temperature: 0.2, maxTokens: 64 },
		'openAiApi',
	),
	name: 'Model',
	connection: 'ai_languageModel',
};

describe('ai.prompt + openAi.chatModel parity with Basic LLM Chain v1.9 + OpenAI Chat Model v1.3', () => {
	const parityCase = openAiCase([{ method: 'POST', url: COMPLETIONS, json: completion('Hello') }]);

	const ALLOWED: readonly AllowedDifference[] = [0, 1].flatMap((index) => [
		{
			path: `requests.POST ${COMPLETIONS} #${index}.body.stream`,
			kind: 'intended',
			reason: 'The action leaves out stream: false, the API default.',
		},
		{
			path: `requests.POST ${COMPLETIONS} #${index}.body.messages[0].role`,
			kind: 'intended',
			reason:
				'LangChain sends the system message as "developer" to reasoning models. The action keeps "system", which OpenAI maps itself and which compatible providers accept.',
		},
	]);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			{
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
				subnodes: [legacyModel],
			},
			parityCase,
		);
		const next = await runNode(
			{
				...actionNode(promptModel, {
					prompt: '={{ $json.question }}',
					system: 'Answer in one word',
				}),
				subnodes: [nextModel],
			},
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const { TextClassifier } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/chains/TextClassifier/TextClassifier.node.js',
) as { TextClassifier: new () => INodeType };

describe('ai.classify parity with Text Classifier v1.1', () => {
	const input = [{ text: 'The parcel came broken' }, { text: 'I love it' }, { text: 'Hello' }];
	const replies = (contents: readonly string[]): ParityCase =>
		openAiCase(
			contents.map((content) => ({
				method: 'POST',
				url: COMPLETIONS,
				times: 1,
				json: completion(content),
			})),
		);
	const categories = [
		{ category: 'complaint', description: 'The user is unhappy' },
		{ category: 'praise', description: 'The user is happy' },
	];

	// Each node asks for its own reply format: booleans per category, or a list of names.
	const ALLOWED: readonly AllowedDifference[] = [0, 1, 2].flatMap((index) => [
		{
			path: `requests.POST ${COMPLETIONS} #${index}.body.messages`,
			kind: 'intended',
			reason:
				'The action states the categories with their descriptions and leaves the format to response_format; the legacy prompt holds format instructions.',
		},
		{
			path: `requests.POST ${COMPLETIONS} #${index}.body.response_format`,
			kind: 'intended',
			reason: 'The action asks for a JSON Schema reply, so the provider enforces the format.',
		},
		{
			path: `requests.POST ${COMPLETIONS} #${index}.body.stream`,
			kind: 'intended',
			reason: 'The action leaves out stream: false, the API default.',
		},
	]);

	it('routes each item to the same output', async () => {
		const legacy = await runNode(
			{
				nodeType: new TextClassifier(),
				type: '@n8n/n8n-nodes-langchain.textClassifier',
				typeVersion: 1.1,
				parameters: {
					inputText: '={{ $json.text }}',
					categories: { categories },
					options: { fallback: 'other' },
				},
				subnodes: [legacyModel],
			},
			{
				...replies([
					'{"complaint": true, "praise": false, "fallback": false}',
					'{"complaint": false, "praise": true, "fallback": false}',
					'{"complaint": false, "praise": false, "fallback": true}',
				]),
				input,
			},
		);
		const next = await runNode(
			{
				...actionNode(classifyText, {
					text: '={{ $json.text }}',
					categories: categories.map(({ category, description }) => ({
						output: category,
						description,
					})),
				}),
				subnodes: [nextModel],
			},
			{
				...replies([
					'{"categories":["complaint"]}',
					'{"categories":["praise"]}',
					'{"categories":[]}',
				]),
				input,
			},
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(1);
		expect(legacy.otherOutputs.map((items) => items.length)).toEqual([1, 1]);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const { Agent } = requireBuilt('@n8n/nodes-langchain/dist/nodes/agents/Agent/Agent.node.js') as {
	Agent: new () => INodeType;
};

describe('ai.agent parity with AI Agent v3.1, without tools', () => {
	const parityCase = openAiCase([{ method: 'POST', url: COMPLETIONS, json: completion('Hello') }]);

	const ALLOWED: readonly AllowedDifference[] = [
		...[0, 1].flatMap((index): AllowedDifference[] => [
			{
				path: `requests.POST ${COMPLETIONS} #${index}.body.stream`,
				kind: 'intended',
				reason: 'The action leaves out stream: false, the API default.',
			},
			{
				path: `requests.POST ${COMPLETIONS} #${index}.body.messages[0].role`,
				kind: 'intended',
				reason: 'LangChain sends the system message as "developer" to reasoning models.',
			},
		]),
		...[0, 1].flatMap((index): AllowedDifference[] => [
			{
				path: `items[${index}].json.output`,
				kind: 'intended',
				reason: 'Every ai.* action gives the reply text as `text`.',
			},
			{
				path: `items[${index}].json.text`,
				kind: 'intended',
				reason: 'Every ai.* action gives the reply text as `text`.',
			},
		]),
	];

	it('sends the same requests and emits the reply text', async () => {
		const legacy = await runNode(
			{
				nodeType: new Agent(),
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 3.1,
				parameters: {
					promptType: 'define',
					text: '={{ $json.question }}',
					options: { systemMessage: 'Answer in one word' },
				},
				subnodes: [legacyModel],
			},
			parityCase,
		);
		const next = await runNode(
			{
				...actionNode(runAgent, { prompt: '={{ $json.question }}', system: 'Answer in one word' }),
				subnodes: [nextModel],
			},
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items.map(({ json }) => json)).toEqual([
			{ output: 'Hello' },
			{ output: 'Hello' },
		]);
		expect(next.items.map(({ json }) => json)).toEqual([{ text: 'Hello' }, { text: 'Hello' }]);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const { InformationExtractor } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/chains/InformationExtractor/InformationExtractor.node.js',
) as { InformationExtractor: new () => INodeType };

describe('ai.prompt with schema parity with Information Extractor v1.2', () => {
	const schema = {
		type: 'object',
		properties: { state: { type: 'string' }, cities: { type: 'array', items: { type: 'string' } } },
		required: ['state', 'cities'],
	};
	const extracted = { state: 'California', cities: ['Los Angeles', 'San Diego'] };
	const parityCase: ParityCase = {
		...openAiCase([
			{ method: 'POST', url: COMPLETIONS, json: completion(JSON.stringify(extracted)) },
		]),
		input: [{ text: 'We flew from Los Angeles to San Diego.' }],
	};

	const ALLOWED: readonly AllowedDifference[] = [
		{
			path: `requests.POST ${COMPLETIONS} #0.body.messages`,
			kind: 'intended',
			reason:
				'The action sends the schema as response_format; the legacy prompt holds format instructions.',
		},
		{
			path: `requests.POST ${COMPLETIONS} #0.body.response_format`,
			kind: 'intended',
			reason: 'The action asks for a JSON Schema reply, so the provider enforces the format.',
		},
		{
			path: `requests.POST ${COMPLETIONS} #0.body.stream`,
			kind: 'intended',
			reason: 'The action leaves out stream: false, the API default.',
		},
		{
			path: 'items[0].json.text',
			kind: 'intended',
			reason: 'Every ai.* action also gives the reply text.',
		},
	];

	it('emits the same extracted object', async () => {
		const legacy = await runNode(
			{
				nodeType: new InformationExtractor(),
				type: '@n8n/n8n-nodes-langchain.informationExtractor',
				typeVersion: 1.2,
				parameters: {
					text: '={{ $json.text }}',
					schemaType: 'manual',
					inputSchema: JSON.stringify(schema),
				},
				subnodes: [legacyModel],
			},
			parityCase,
		);
		const next = await runNode(
			{
				...actionNode(promptModel, {
					prompt: '={{ $json.text }}',
					system: 'Extract the state and the cities from the text.',
					schema,
				}),
				subnodes: [nextModel],
			},
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items.map(({ json }) => json)).toEqual([{ output: extracted }]);
		expect(next.items.map(({ json }) => json)).toEqual([
			{ text: JSON.stringify(extracted), output: extracted },
		]);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

const { SentimentAnalysis } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/chains/SentimentAnalysis/SentimentAnalysis.node.js',
) as { SentimentAnalysis: new () => INodeType };

describe('ai.classify parity with Sentiment Analysis v1.1', () => {
	const input = [{ text: 'The parcel came broken' }, { text: 'I love it' }];
	const replies = (contents: readonly string[]): ParityCase => ({
		...openAiCase(
			contents.map((content) => ({
				method: 'POST',
				url: COMPLETIONS,
				times: 1,
				json: completion(content),
			})),
		),
		input,
	});
	const sentiments = ['Positive', 'Neutral', 'Negative'];

	const ALLOWED: readonly AllowedDifference[] = [
		...['items[0].json.sentimentAnalysis', 'otherOutputs[1][0].json.sentimentAnalysis'].map(
			(path): AllowedDifference => ({
				path,
				kind: 'intended',
				reason: 'The action passes the item on unchanged; the output name is the sentiment.',
			}),
		),
		{
			path: 'otherOutputs[2]',
			kind: 'intended',
			reason: 'ai.classify always has an "other" output for items that fit no category.',
		},
		...[0, 1].flatMap((index): AllowedDifference[] => [
			{
				path: `requests.POST ${COMPLETIONS} #${index}.body.messages`,
				kind: 'intended',
				reason:
					'The action states the categories and leaves the format to response_format; the legacy prompt holds format instructions.',
			},
			{
				path: `requests.POST ${COMPLETIONS} #${index}.body.response_format`,
				kind: 'intended',
				reason: 'The action asks for a JSON Schema reply, so the provider enforces the format.',
			},
			{
				path: `requests.POST ${COMPLETIONS} #${index}.body.stream`,
				kind: 'intended',
				reason: 'The action leaves out stream: false, the API default.',
			},
		]),
	];

	it('routes each item to the output of its sentiment', async () => {
		const legacy = await runNode(
			{
				nodeType: new SentimentAnalysis(),
				type: '@n8n/n8n-nodes-langchain.sentimentAnalysis',
				typeVersion: 1.1,
				parameters: { inputText: '={{ $json.text }}' },
				subnodes: [legacyModel],
			},
			replies([
				'{"sentiment":"Negative","strength":0.9,"confidence":0.8}',
				'{"sentiment":"Positive","strength":0.7,"confidence":0.9}',
			]),
		);
		const next = await runNode(
			{
				...actionNode(classifyText, {
					text: '={{ $json.text }}',
					categories: sentiments.map((output) => ({ output })),
				}),
				subnodes: [nextModel],
			},
			replies(['{"categories":["Negative"]}', '{"categories":["Positive"]}']),
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(
			[next.items, ...next.otherOutputs].map((items) => items.map(({ json }) => json)),
		).toEqual([[input[1]], [], [input[0]], []]);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

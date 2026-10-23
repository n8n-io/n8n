import { generateText, streamText } from 'ai';
import nock from 'nock';
import { generateKeyPairSync } from 'node:crypto';

import { createModel } from '../model/model-factory';

const credentials = {
	project: 'selected-project',
	location: 'global',
	clientEmail: 'agent@selected-project.iam.gserviceaccount.com',
	privateKey: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
		type: 'pkcs8',
		format: 'pem',
	}),
};

const chatResponse = {
	id: 'completion-1',
	object: 'chat.completion',
	created: 1,
	choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
	usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
};

describe('Vertex model routing', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://oauth2.googleapis.com').post('/token').reply(200, {
			access_token: 'vertex-access-token',
			token_type: 'Bearer',
			expires_in: 3600,
		});
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	const routingCases = [
		{
			model: 'gemini-3-flash-preview',
			sdk: '@ai-sdk/google-vertex',
			location: 'global',
			host: 'aiplatform.googleapis.com',
			apiVersion: 'v1beta1',
			path: 'publishers/google/models/gemini-3-flash-preview:generateContent',
			response: {
				candidates: [
					{ content: { role: 'model', parts: [{ text: 'Hello' }] }, finishReason: 'STOP' },
				],
				usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 },
			},
			request: { contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] },
		},
		{
			model: 'claude-opus-5@default',
			sdk: '@ai-sdk/google-vertex/anthropic',
			location: 'global',
			host: 'aiplatform.googleapis.com',
			path: 'publishers/anthropic/models/claude-opus-5@default:rawPredict',
			response: {
				id: 'message-1',
				type: 'message',
				role: 'assistant',
				model: 'claude-opus-5@default',
				content: [{ type: 'text', text: 'Hello' }],
				stop_reason: 'end_turn',
				stop_sequence: null,
				usage: { input_tokens: 10, output_tokens: 2 },
			},
			request: { anthropic_version: 'vertex-2023-10-16' },
		},
		{
			model: 'mistral-medium-3',
			sdk: '@ai-sdk/mistral',
			location: 'europe-west4',
			host: 'europe-west4-aiplatform.googleapis.com',
			path: 'publishers/mistralai/models/mistral-medium-3:rawPredict',
			response: { ...chatResponse, model: 'mistral-medium-3' },
			request: {
				model: 'mistral-medium-3',
				messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
			},
		},
		...[
			'deepseek-ai/deepseek-v3.2-maas',
			'google/gemma-4-26b-a4b-it-maas',
			'meta/llama-4-maverick-17b-128e-instruct-maas',
			'minimax/minimax-m2-maas',
			'moonshotai/kimi-k2-thinking-maas',
			'openai/gpt-oss-120b-maas',
			'qwen/qwen3-235b-a22b-instruct-2507-maas',
			'zai-org/glm-5-maas',
		].map((model) => ({
			model,
			sdk: '@ai-sdk/openai-compatible',
			location: 'europe-west4',
			host: 'europe-west4-aiplatform.googleapis.com',
			apiVersion: 'v1',
			path: 'endpoints/openapi/chat/completions',
			response: chatResponse,
			request: { model },
		})),
		{
			model: 'xai/grok-4.20-reasoning',
			sdk: '@ai-sdk/openai-compatible',
			location: 'global',
			host: 'aiplatform.googleapis.com',
			path: 'endpoints/openapi/chat/completions',
			response: chatResponse,
			request: { model: 'xai/grok-4.20-reasoning' },
		},
	];

	it.each(routingCases.flatMap((testCase) => [testCase, { ...testCase, sdk: undefined }]))(
		'sends $model through its Vertex API with SDK $sdk and service-account auth',
		async (testCase) => {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(Response.json(testCase.response));
			const model = createModel(
				{
					...credentials,
					id: `google-vertex/${testCase.model}`,
					sdk: testCase.sdk,
					location: testCase.location,
				},
				fetch,
			);

			const result = await generateText({ model, prompt: 'Hello', maxRetries: 0 });

			expect(result.text).toBe('Hello');
			const [url, init] = fetch.mock.calls[0];
			expect(url).toBe(
				`https://${testCase.host}/${testCase.apiVersion ?? 'v1'}/projects/selected-project/locations/${testCase.location}/${testCase.path}`,
			);
			expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer vertex-access-token');
			expect(JSON.parse(init?.body as string)).toMatchObject(testCase.request);
			expect(nock.isDone()).toBe(true);
		},
	);

	it.each(['@ai-sdk/mistral', undefined])(
		'streams Mistral responses through streamRawPredict with SDK %s',
		async (sdk) => {
			const chunks = [
				{
					...chatResponse,
					choices: [
						{ index: 0, delta: { role: 'assistant', content: 'Hello' }, finish_reason: null },
					],
				},
				{ ...chatResponse, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
			];
			const response = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('');
			const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				new Response(`${response}data: [DONE]\n\n`, {
					headers: { 'content-type': 'text/event-stream' },
				}),
			);
			const model = createModel({ ...credentials, id: 'google-vertex/codestral-2', sdk }, fetch);

			const result = streamText({ model, prompt: 'Hello', maxRetries: 0 });

			await expect(result.text).resolves.toBe('Hello');
			const [url, init] = fetch.mock.calls[0];
			expect(url).toBe(
				'https://aiplatform.googleapis.com/v1/projects/selected-project/locations/global/publishers/mistralai/models/codestral-2:streamRawPredict',
			);
			expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer vertex-access-token');
			expect(JSON.parse(init?.body as string)).toMatchObject({
				model: 'codestral-2',
				stream: true,
			});
		},
	);

	it.each([
		{ id: 'google-vertex/unknown-model' },
		{ id: 'google-vertex/unknown/llama-4-maas' },
		{ id: 'google-vertex/meta/unknown-model-maas' },
		{ id: 'google-vertex/claude-opus-5@default', sdk: '@ai-sdk/unknown' },
	])('rejects unresolved Vertex routing for $id', (config) => {
		expect(() => createModel({ ...credentials, ...config })).toThrow(/Vertex.*SDK/);
	});
});

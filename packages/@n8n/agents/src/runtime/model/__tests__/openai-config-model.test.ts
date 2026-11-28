import type { OpenAiModel } from '@n8n/ai-utilities';
import type { EgressFilter } from '@n8n/ai-utilities/http-proxy-agent';
import { generateText, stepCountIs, streamText, tool } from 'ai';
import { lookup } from 'node:dns';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';

import { createOpenAiConfigModel } from '../openai-config-model';

type RecordedRequest = {
	method?: string;
	url?: string;
	headers: IncomingMessage['headers'];
	body: Record<string, unknown>;
};

type Responder = (res: ServerResponse, req: IncomingMessage) => void;

const usage = { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 };

function completion(message: Record<string, unknown>, finishReason = 'stop') {
	return {
		id: 'chatcmpl-1',
		object: 'chat.completion',
		created: 0,
		model: 'vendor-model',
		choices: [
			{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finishReason },
		],
		usage,
	};
}

const json =
	(body: unknown): Responder =>
	(res) => {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify(body));
	};

const chunk = (choice: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
	`data: ${JSON.stringify({ id: 'chatcmpl-1', object: 'chat.completion.chunk', created: 0, model: 'vendor-model', choices: [{ index: 0, ...choice }], ...extra })}\n\n`;

const textStream: Responder = (res) => {
	res.writeHead(200, { 'content-type': 'text/event-stream' });
	res.end(
		chunk({ delta: { role: 'assistant', content: 'Hel' } }) +
			chunk({ delta: { content: 'lo' } }) +
			chunk({ delta: {}, finish_reason: 'stop' }) +
			`data: ${JSON.stringify({ id: 'chatcmpl-1', object: 'chat.completion.chunk', created: 0, model: 'vendor-model', choices: [], usage })}\n\n` +
			'data: [DONE]\n\n',
	);
};

const allowAll: EgressFilter = {
	validateUrl: async () => ({ ok: true }),
	validateConnectionHost: () => ({ ok: true }),
	createSecureLookup: () => lookup,
};

const blockAll: EgressFilter = {
	...allowAll,
	validateUrl: async () => ({ ok: false, error: new Error('Blocked by the egress policy') }),
};

const responsesReply = {
	id: 'resp_1',
	object: 'response',
	created_at: 0,
	model: 'vendor-model',
	status: 'completed',
	output: [
		{
			type: 'message',
			id: 'msg_1',
			role: 'assistant',
			status: 'completed',
			content: [{ type: 'output_text', text: 'Hello', annotations: [] }],
		},
	],
	usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 },
};

describe('createOpenAiConfigModel', () => {
	let server: Server;
	let baseUrl: string;
	const requests: RecordedRequest[] = [];
	let responders: Responder[] = [];
	let closedRequests = 0;

	beforeAll(async () => {
		server = createServer((req, res) => {
			let raw = '';
			req.on('data', (data: Buffer) => (raw += data.toString()));
			req.on('end', () => {
				requests.push({
					method: req.method,
					url: req.url,
					headers: req.headers,
					body: JSON.parse(raw) as Record<string, unknown>,
				});
				const respond = responders.shift();
				if (respond) respond(res, req);
				else res.writeHead(500).end();
			});
			res.on('close', () => {
				if (!res.writableFinished) closedRequests++;
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
	});

	afterAll(async () => {
		server.closeAllConnections();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	beforeEach(() => {
		requests.length = 0;
		responders = [];
		closedRequests = 0;
	});

	/** Shaped like the config of a published community chat model node. */
	const integratorConfig = (): OpenAiModel => ({
		type: 'openai',
		baseUrl,
		apiKey: 'vendor-key',
		model: 'vendor-model',
		defaultHeaders: { 'X-Title': 'n8n', 'HTTP-Referer': 'https://n8n.io' },
		frequencyPenalty: 0.1,
		maxTokens: 256,
		maxRetries: 2,
		presencePenalty: 0.2,
		temperature: 0.3,
		timeout: 60_000,
		topP: 0.4,
		additionalParams: {
			response_format: { type: 'json_object' },
			provider: { data_residency: 'eu' },
		},
	});

	const expectedConfigFields = {
		model: 'vendor-model',
		temperature: 0.3,
		top_p: 0.4,
		frequency_penalty: 0.1,
		presence_penalty: 0.2,
		max_tokens: 256,
		response_format: { type: 'json_object' },
		provider: { data_residency: 'eu' },
	};

	it('sends the config to the chat completions endpoint on generate', async () => {
		responders.push(json(completion({ content: 'Hello' })));
		const model = await createOpenAiConfigModel(integratorConfig(), allowAll);

		const result = await generateText({ model, prompt: 'Hi' });

		expect(result.text).toBe('Hello');
		expect(result.usage).toMatchObject({ inputTokens: 11, outputTokens: 7, totalTokens: 18 });
		expect(requests).toHaveLength(1);
		const [request] = requests;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('/v1/chat/completions');
		expect(request.headers).toMatchObject({
			authorization: 'Bearer vendor-key',
			'x-title': 'n8n',
			'http-referer': 'https://n8n.io',
		});
		expect(request.body).toEqual({
			...expectedConfigFields,
			messages: [{ role: 'user', content: 'Hi' }],
		});
	});

	it('sends the config and asks for usage on stream', async () => {
		responders.push(textStream);
		const model = await createOpenAiConfigModel(integratorConfig(), allowAll);

		const result = streamText({ model, prompt: 'Hi' });

		expect(await result.text).toBe('Hello');
		expect(await result.usage).toMatchObject({ inputTokens: 11, outputTokens: 7, totalTokens: 18 });
		expect(requests[0].url).toBe('/v1/chat/completions');
		expect(requests[0].body).toEqual({
			...expectedConfigFields,
			messages: [{ role: 'user', content: 'Hi' }],
			stream: true,
			stream_options: { include_usage: true },
		});
	});

	it('lets a call setting replace a config default', async () => {
		responders.push(json(completion({ content: 'Hello' })));
		const model = await createOpenAiConfigModel(integratorConfig(), allowAll);

		await generateText({ model, prompt: 'Hi', temperature: 0.9, maxOutputTokens: 32 });

		expect(requests[0].body).toMatchObject({ temperature: 0.9, max_tokens: 32, top_p: 0.4 });
	});

	it('runs a tool call round trip', async () => {
		responders.push(
			json(
				completion(
					{
						content: null,
						tool_calls: [
							{
								id: 'call_1',
								type: 'function',
								function: { name: 'getWeather', arguments: '{"city":"Berlin"}' },
							},
						],
					},
					'tool_calls',
				),
			),
			json(completion({ content: 'It is sunny in Berlin.' })),
		);
		const model = await createOpenAiConfigModel(
			{ ...integratorConfig(), supportsStrictToolCalling: true },
			allowAll,
		);

		const result = await generateText({
			model,
			prompt: 'Weather in Berlin?',
			tools: {
				getWeather: tool({
					description: 'Get the weather for a city',
					inputSchema: z.object({ city: z.string() }),
					execute: async ({ city }) => ({ city, weather: 'sunny' }),
				}),
			},
			stopWhen: stepCountIs(2),
		});

		expect(result.text).toBe('It is sunny in Berlin.');
		expect(result.totalUsage).toMatchObject({ inputTokens: 22, outputTokens: 14 });
		expect(requests).toHaveLength(2);
		expect(requests[0].body.tools).toEqual([
			{
				type: 'function',
				function: expect.objectContaining({ name: 'getWeather', strict: true }),
			},
		]);
		expect(requests[1].body.messages).toEqual([
			{ role: 'user', content: 'Weather in Berlin?' },
			{
				role: 'assistant',
				content: null,
				tool_calls: [
					{
						id: 'call_1',
						type: 'function',
						function: { name: 'getWeather', arguments: '{"city":"Berlin"}' },
					},
				],
			},
			{
				role: 'tool',
				tool_call_id: 'call_1',
				content: JSON.stringify({ city: 'Berlin', weather: 'sunny' }),
			},
		]);
	});

	it('cancels the request when the call is aborted', async () => {
		const abort = new AbortController();
		responders.push(() => abort.abort());
		const model = await createOpenAiConfigModel(integratorConfig(), allowAll);

		await expect(
			generateText({ model, prompt: 'Hi', abortSignal: abort.signal, maxRetries: 0 }),
		).rejects.toThrow('This operation was aborted');

		await vi.waitFor(() => expect(closedRequests).toBe(1));
	});

	it('does not send a request that the egress filter rejects', async () => {
		const model = await createOpenAiConfigModel(integratorConfig(), blockAll);

		await expect(generateText({ model, prompt: 'Hi', maxRetries: 0 })).rejects.toThrow(
			'Blocked by the egress policy',
		);

		expect(requests).toHaveLength(0);
	});

	it('gives up when the endpoint sends no headers within the config timeout', async () => {
		responders.push(() => {});
		const model = await createOpenAiConfigModel({ ...integratorConfig(), timeout: 100 }, allowAll);

		await expect(generateText({ model, prompt: 'Hi', maxRetries: 0 })).rejects.toThrow(
			'Headers Timeout Error',
		);

		await vi.waitFor(() => expect(closedRequests).toBe(1));
	});

	it('sends max_completion_tokens and reasoning_effort for a reasoning model', async () => {
		responders.push(json(completion({ content: 'Hello' })));
		const model = await createOpenAiConfigModel(
			{ ...integratorConfig(), model: 'o3-mini', reasoning: { effort: 'low' } },
			allowAll,
		);

		await generateText({ model, prompt: 'Hi' });

		expect(requests[0].body).toMatchObject({ max_completion_tokens: 256, reasoning_effort: 'low' });
		expect(requests[0].body).not.toHaveProperty('max_tokens');
	});

	it('does not send reasoning_effort for a model that ChatOpenAI does not treat as reasoning', async () => {
		responders.push(json(completion({ content: 'Hello' })));
		const model = await createOpenAiConfigModel(
			{ ...integratorConfig(), reasoning: { effort: 'low' } },
			allowAll,
		);

		await generateText({ model, prompt: 'Hi' });

		expect(requests[0].body).not.toHaveProperty('reasoning_effort');
	});

	it('sends the config to the Responses endpoint when useResponsesApi is set', async () => {
		responders.push(json(responsesReply));
		const model = await createOpenAiConfigModel(
			{ ...integratorConfig(), useResponsesApi: true },
			allowAll,
		);

		const result = await generateText({ model, prompt: 'Hi' });

		expect(result.text).toBe('Hello');
		expect(requests[0].url).toBe('/v1/responses');
		expect(requests[0].headers.authorization).toBe('Bearer vendor-key');
		expect(requests[0].body).toMatchObject({
			model: 'vendor-model',
			temperature: 0.3,
			top_p: 0.4,
			max_output_tokens: 256,
			store: false,
			response_format: { type: 'json_object' },
			provider: { data_residency: 'eu' },
		});
	});

	it('keeps Responses requests stateless and sends no key of the host without a config key', async () => {
		vi.stubEnv('OPENAI_API_KEY', 'host-key');
		responders.push(json(responsesReply));
		const config = integratorConfig();
		const model = await createOpenAiConfigModel(
			{
				...config,
				// A node written in JavaScript can leave the key out.
				apiKey: undefined as unknown as string,
				useResponsesApi: true,
				additionalParams: { ...config.additionalParams, store: true },
			},
			allowAll,
		);

		await generateText({ model, prompt: 'Hi' });

		expect(requests[0].headers.authorization).not.toContain('host-key');
		expect(requests[0].body).toMatchObject({ store: false, provider: { data_residency: 'eu' } });
	});
});

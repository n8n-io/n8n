import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { accumulateTokenUsage } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { OpenAI } from 'openai';
import type { Mocked } from 'vitest';

import { CustomModelEndpoint } from '../CustomModelEndpoint.node';

import {
	createCustomModelEndpointConfig,
	OPENAI_CREDENTIAL,
} from '@utils/custom-model-endpoint/gateway-config';

// The real transport goes out through `proxyFetch`, whose dispatcher needs the instance
// SSRF module. This stands in for the gateway so a unit test can read the wire headers.
const { gateway } = vi.hoisted(() => ({
	gateway: {
		calls: [] as Array<{ url: string; headers: Headers }>,
		reply: (_url: string, _headers: Headers) => new Response('{}', { status: 200 }),
	},
}));

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	getProxyAgent: () => undefined,
	proxyFetch: async ({ input, init }: { input: RequestInfo | URL; init?: RequestInit }) => {
		const headers = new Headers(init?.headers ?? {});
		gateway.calls.push({ url: String(input), headers });
		return gateway.reply(String(input), headers);
	},
}));

vi.mock('openai');
vi.mock('n8n-workflow', async (importOriginal) => ({
	...(await importOriginal<typeof import('n8n-workflow')>()),
	accumulateTokenUsage: vi.fn(),
}));
vi.mock('@utils/custom-model-endpoint/gateway-config', async (importOriginal) => ({
	...(await importOriginal<typeof import('@utils/custom-model-endpoint/gateway-config')>()),
	createCustomModelEndpointConfig: vi.fn(() => ({
		configuration: { baseURL: 'https://gateway.example.com/v1', fetch: vi.fn() },
		endpoint: { baseUrl: 'https://gateway.example.com/v1', login: { type: 'none' } },
	})),
}));

const MockedOpenAI = vi.mocked(OpenAI);

const nodeDef: INode = {
	id: '1',
	name: 'Custom Model Endpoint',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.customModelEndpoint',
	position: [0, 0],
	parameters: {},
	credentials: { customModelEndpointApi: { id: '1', name: 'cred' } },
};

type Params = Record<string, unknown>;

const answer = (overrides: Record<string, unknown> = {}) => ({
	choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }],
	usage: { prompt_tokens: 11, completion_tokens: 7 },
	...overrides,
});

/** Built rather than written, so the node-param lint rule does not read it as a display name. */
const BLANK = ' '.repeat(1);

let create: ReturnType<typeof vi.fn>;

const contextWith = (params: Params = {}, items = 1) => {
	const ctx = createMockExecuteFunction<IExecuteFunctions>(
		{},
		nodeDef,
	) as Mocked<IExecuteFunctions>;

	ctx.getNode = vi.fn().mockReturnValue(nodeDef);
	ctx.getCredentials = vi.fn().mockResolvedValue({ url: 'https://gateway.example.com/v1' });
	ctx.getWorkflow = vi.fn().mockReturnValue({ id: 'wf-1', name: 'Nightly' });
	ctx.getExecutionId = vi.fn().mockReturnValue('exec-1');
	ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(undefined);
	ctx.continueOnFail = vi.fn().mockReturnValue(false);
	ctx.getInputData = vi.fn().mockReturnValue(Array.from({ length: items }, () => ({ json: {} })));

	const given: Params = {
		model: 'gpt-4o',
		'messages.message': [{ role: 'user', content: 'hi' }],
		options: {},
		sendContextHeaders: false,
		...params,
	};
	ctx.getNodeParameter = vi
		.fn()
		.mockImplementation((name: string, _i: number, fallback: unknown) =>
			name in given ? given[name] : fallback,
		);

	return ctx;
};

const run = async (params: Params = {}, items = 1): Promise<INodeExecutionData[]> => {
	const result = await new CustomModelEndpoint().execute.call(contextWith(params, items));
	return result[0];
};

const sentBody = () => create.mock.calls[0][0];
const sentOptions = () => create.mock.calls[0][1];
const transportOptions = (call: number) =>
	vi.mocked(createCustomModelEndpointConfig).mock.calls[call][2];
const transportHeaders = () => ({
	...transportOptions(0).contextHeaders,
	...transportOptions(0).userHeaders,
});

describe('CustomModelEndpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		create = vi.fn().mockResolvedValue(answer());
		// A constructor, not an arrow: the node calls `new OpenAI(...)`
		MockedOpenAI.mockImplementation(function () {
			return { chat: { completions: { create } } } as unknown as OpenAI;
		});
	});

	it('builds the client on the gateway base URL, with its own retries off', async () => {
		await run();

		expect(MockedOpenAI.mock.calls[0][0]).toMatchObject({
			baseURL: 'https://gateway.example.com/v1',
			// The transport owns retries, so the client must not add its own
			maxRetries: 0,
		});
	});

	it('sends the messages in order and drops rows with no content', async () => {
		await run({
			'messages.message': [
				{ role: 'system', content: 'be brief' },
				{ role: 'user', content: '' },
				{ role: 'user', content: 'hi' },
			],
		});

		expect(sentBody().messages).toEqual([
			{ role: 'system', content: 'be brief' },
			{ role: 'user', content: 'hi' },
		]);
	});

	it('refuses to call the gateway with nothing to say', async () => {
		await expect(run({ 'messages.message': [{ role: 'user', content: '' }] })).rejects.toThrow(
			'no message to send',
		);
		expect(create).not.toHaveBeenCalled();
	});

	it('maps the two token caps to their own fields', async () => {
		await run({ options: { maxTokens: 100, maxCompletionTokens: 50 } });

		expect(sentBody()).toMatchObject({ max_tokens: 100, max_completion_tokens: 50 });
	});

	it('treats the -1 token defaults as unset rather than a real limit', async () => {
		await run({ options: { maxTokens: -1, maxCompletionTokens: -1 } });

		expect(sentBody().max_tokens).toBeUndefined();
		expect(sentBody().max_completion_tokens).toBeUndefined();
	});

	it('splits stop sequences and trims them', async () => {
		await run({ options: { stop: 'END, STOP ' } });

		expect(sentBody().stop).toEqual(['END', 'STOP']);
	});

	it('merges Extra Body into the request', async () => {
		await run({ extraBody: '{"tools":[{"type":"function"}]}' });

		expect(sentBody().tools).toEqual([{ type: 'function' }]);
	});

	it('hands per-request headers to the transport, not to the request', async () => {
		await run({
			'headers.header': [
				{ name: 'x-tenant', value: 'acme' },
				{ name: BLANK, value: 'dropped' },
			],
		});

		// The transport layer is the one that beats a gateway header of the same name.
		// The real-transport test at the end of this file proves that precedence.
		expect(transportHeaders()).toEqual({ 'x-tenant': 'acme' });
		expect(sentOptions().headers).toBeUndefined();
	});

	it('sends the n8n context headers on the transport when the switch is on', async () => {
		await run({ sendContextHeaders: true });

		expect(transportHeaders()).toEqual({
			'x-n8n-workflow-id': 'wf-1',
			'x-n8n-workflow-name': 'Nightly',
			'x-n8n-execution-id': 'exec-1',
		});
	});

	it('sends none of them when the switch is off', async () => {
		await run({ sendContextHeaders: false });

		expect(transportHeaders()).toEqual({});
	});

	it('passes the execution cancel signal to the request', async () => {
		const signal = new AbortController().signal;
		const ctx = contextWith();
		ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(signal);

		await new CustomModelEndpoint().execute.call(ctx);

		expect(sentOptions().signal).toBe(signal);
	});

	it('returns the answer, the reason it stopped and the raw response', async () => {
		const [item] = await run();

		expect(item.json).toMatchObject({ text: 'hello', finishReason: 'stop' });
		expect(item.json.response).toEqual(answer());
		expect(item.json).not.toHaveProperty('toolCalls');
		expect(item.pairedItem).toEqual({ item: 0 });
	});

	it('returns tool calls only when the model made one', async () => {
		const toolCalls = [{ id: 'c1', type: 'function', function: { name: 'f', arguments: '{}' } }];
		create.mockResolvedValue(
			answer({
				choices: [
					{ message: { content: null, tool_calls: toolCalls }, finish_reason: 'tool_calls' },
				],
			}),
		);

		const [item] = await run();

		expect(item.json).toMatchObject({ text: '', finishReason: 'tool_calls', toolCalls });
	});

	it('reports token usage', async () => {
		await run();

		expect(accumulateTokenUsage).toHaveBeenCalledWith(expect.anything(), 11, 7);
	});

	it('reports nothing rather than NaN when the gateway sends a malformed usage block', async () => {
		create.mockResolvedValue(answer({ usage: { prompt_tokens: 'lots', completion_tokens: null } }));

		await run();

		expect(accumulateTokenUsage).not.toHaveBeenCalled();
	});

	it('gives each item its own headers, on its own transport', async () => {
		const ctx = contextWith({}, 2);
		ctx.getNodeParameter = vi
			.fn()
			.mockImplementation((name: string, i: number, fallback: unknown) => {
				// A name only item 0 sends, so a leak into item 1 cannot hide behind an overwrite
				if (name === 'headers.header') return i === 0 ? [{ name: 'x-first', value: 'set' }] : [];
				if (name === 'model') return 'gpt-4o';
				if (name === 'messages.message') return [{ role: 'user', content: 'hi' }];
				if (name === 'sendContextHeaders') return false;
				if (name === 'options') return {};
				return fallback;
			});

		await new CustomModelEndpoint().execute.call(ctx);

		// Each item gets its own transport, so the record it was built with is the record
		// it sends. A shared one leaks: the refresh path layers over its own copy, so a
		// header from an earlier item would survive into a later item's retry after a 401.
		const records = vi
			.mocked(createCustomModelEndpointConfig)
			.mock.calls.map((call) => ({ ...call[2].contextHeaders, ...call[2].userHeaders }));

		expect(records).toEqual([{ 'x-first': 'set' }, {}]);
	});

	it('builds one transport for each item', async () => {
		await run({}, 3);

		expect(MockedOpenAI).toHaveBeenCalledTimes(3);
		expect(create).toHaveBeenCalledTimes(3);
	});

	it('carries a failed item on when Continue On Fail is set, and keeps the pairing', async () => {
		create.mockRejectedValueOnce(new Error('gateway said no')).mockResolvedValue(answer());
		const ctx = contextWith({}, 2);
		ctx.continueOnFail = vi.fn().mockReturnValue(true);

		const [failed, succeeded] = (await new CustomModelEndpoint().execute.call(ctx))[0];

		expect(failed.json).toEqual({ error: 'gateway said no' });
		expect(failed.pairedItem).toEqual({ item: 0 });
		expect(succeeded.json).toMatchObject({ text: 'hello' });
	});

	// The shared token source reads the credential, so it has to be built inside the
	// per-item try, not before the loop where the throw would end the run
	it('carries a credential the run cannot use on as an error item', async () => {
		const ctx = contextWith({}, 2);
		ctx.getCredentials = vi.fn().mockResolvedValue({ url: 'my-gateway' });
		ctx.continueOnFail = vi.fn().mockReturnValue(true);

		const items = (await new CustomModelEndpoint().execute.call(ctx))[0];

		expect(items).toHaveLength(2);
		expect(items.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(String(items[0].json.error)).toContain('no usable Base URL');
	});

	it('sends the model and every sampling option the user set', async () => {
		await run({
			model: 'llama-3.1-70b',
			options: {
				frequencyPenalty: 0.4,
				presencePenalty: -0.2,
				temperature: 0.7,
				topP: 0.9,
				seed: 42,
			},
		});

		expect(sentBody()).toMatchObject({
			model: 'llama-3.1-70b',
			frequency_penalty: 0.4,
			presence_penalty: -0.2,
			temperature: 0.7,
			top_p: 0.9,
			seed: 42,
		});
	});

	it('gives the Timeout to the transport and to the client, so neither cuts the other short', async () => {
		await run({ options: { timeout: 900_000 } });

		expect(transportOptions(0).timeout).toBe(900_000);
		expect(MockedOpenAI.mock.calls[0][0]).toMatchObject({ timeout: 900_000 });
	});

	it('reads the Timeout and the context switch for each item, not once for the run', async () => {
		const ctx = contextWith({}, 2);
		ctx.getNodeParameter = vi
			.fn()
			.mockImplementation((name: string, i: number, fallback: unknown) => {
				if (name === 'options') return { timeout: (i + 1) * 1_000 };
				if (name === 'sendContextHeaders') return i === 1;
				if (name === 'model') return 'gpt-4o';
				if (name === 'messages.message') return [{ role: 'user', content: 'hi' }];
				if (name === 'headers.header') return [];
				return fallback;
			});

		await new CustomModelEndpoint().execute.call(ctx);

		expect([transportOptions(0).timeout, transportOptions(1).timeout]).toEqual([1_000, 2_000]);
		expect(transportOptions(0).contextHeaders).toEqual({});
		expect(transportOptions(1).contextHeaders).toMatchObject({ 'x-n8n-workflow-id': 'wf-1' });
	});

	it('refuses to stream, naming the option to remove', async () => {
		const failure = await run({ extraBody: '{"stream":true}' }).catch(
			(error: NodeOperationError) => error,
		);

		// The catch unwraps an SDK error to its cause, so a hint the node wrote has to survive it
		expect(failure).toMatchObject({
			message: 'This node cannot stream the answer',
			description:
				'Remove "stream" from Extra Body. The node reads the whole answer before it passes the item on.',
			context: { itemIndex: 0 },
		});
		expect(create).not.toHaveBeenCalled();
	});

	it('gives the reason the transport stated, not the wrapper of the SDK', async () => {
		const blocked = Object.assign(new Error('Blocked by SSRF policy'), {
			description: 'Allow the host on the credential.',
		});
		create
			.mockResolvedValueOnce(answer())
			.mockRejectedValueOnce(Object.assign(new Error('Connection error.'), { cause: blocked }));

		const failure = await new CustomModelEndpoint().execute
			.call(contextWith({}, 2))
			.catch((error: NodeOperationError) => error);

		expect(failure).toMatchObject({
			message: 'Blocked by SSRF policy',
			description: 'Allow the host on the credential.',
			context: { itemIndex: 1 },
		});
	});

	it('runs on an OpenAI credential as well as its own', async () => {
		const ctx = contextWith({});
		ctx.getNode = vi.fn().mockReturnValue({
			...nodeDef,
			parameters: { authentication: OPENAI_CREDENTIAL },
			credentials: { [OPENAI_CREDENTIAL]: { id: '2', name: 'openai' } },
		});
		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'sk-test' });

		await new CustomModelEndpoint().execute.call(ctx);

		expect(ctx.getCredentials).toHaveBeenCalledWith(OPENAI_CREDENTIAL);
		expect(transportOptions(0).credentialType).toBe(OPENAI_CREDENTIAL);
	});
});

const GATEWAY = 'https://gateway.example.com/v1';
const TOKEN_URL = 'https://gateway.example.com/oauth2/token';
const CHAT_URL = `${GATEWAY}/chat/completions`;

/**
 * Everything above mocks the transport away. This block runs the real one against a
 * stubbed fetch, so the headers it asserts are the headers that would go on the wire.
 */
describe('CustomModelEndpoint, through the real transport', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		gateway.calls.length = 0;

		const actual = await vi.importActual<
			typeof import('@utils/custom-model-endpoint/gateway-config')
		>('@utils/custom-model-endpoint/gateway-config');
		vi.mocked(createCustomModelEndpointConfig).mockImplementation(
			actual.createCustomModelEndpointConfig,
		);

		const { OpenAI: RealOpenAI } = await vi.importActual<typeof import('openai')>('openai');
		MockedOpenAI.mockImplementation(function (options?: ConstructorParameters<typeof OpenAI>[0]) {
			return new RealOpenAI(options) as unknown as OpenAI;
		});
	});

	const contextSignedInWithOAuth2 = (items: number) => {
		const ctx = contextWith({}, items);

		ctx.getCredentials = vi.fn().mockResolvedValue({
			url: GATEWAY,
			authentication: 'oauth2',
			tokenUrl: TOKEN_URL,
			clientId: 'id',
			clientSecret: 'secret',
			gatewayHeaders: { headers: [{ name: 'x-item-1', value: 'from-the-credential' }] },
		});
		ctx.helpers = {
			getSecureEgressFilter: () => ({ validateUrl: async () => ({ ok: true }) }),
		} as unknown as IExecuteFunctions['helpers'];
		ctx.getNodeParameter = vi
			.fn()
			.mockImplementation((name: string, itemIndex: number, fallback: unknown) => {
				// A name of its own for each item, so a leak cannot hide behind an overwrite
				if (name === 'headers.header') return [{ name: `x-item-${itemIndex}`, value: 'set' }];
				if (name === 'model') return 'gpt-4o';
				if (name === 'messages.message') return [{ role: 'user', content: 'hi' }];
				if (name === 'sendContextHeaders') return false;
				return fallback;
			});

		return ctx;
	};

	it.each([2, 5])('signs in one time for a run of %i items', async (items) => {
		gateway.reply = (url) =>
			new Response(
				JSON.stringify(url === TOKEN_URL ? { access_token: 'token', expires_in: 3600 } : answer()),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);

		await new CustomModelEndpoint().execute.call(contextSignedInWithOAuth2(items));

		expect(gateway.calls.filter((call) => call.url === CHAT_URL)).toHaveLength(items);
		expect(gateway.calls.filter((call) => call.url === TOKEN_URL)).toHaveLength(1);
	});

	it("keeps an earlier item's header out of a later item's retry after a 401", async () => {
		let minted = 0;
		let attempts = 0;
		gateway.reply = (url) => {
			if (url === TOKEN_URL) {
				return new Response(JSON.stringify({ access_token: `token-${++minted}` }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
			// Every first attempt expires, so each item runs the refresh and retries
			const expired = ++attempts % 2 === 1;
			return new Response(JSON.stringify(expired ? { message: 'expired' } : answer()), {
				status: expired ? 401 : 200,
				headers: { 'content-type': 'application/json' },
			});
		};

		await new CustomModelEndpoint().execute.call(contextSignedInWithOAuth2(2));

		const chat = gateway.calls.filter((call) => call.url === CHAT_URL);
		const retryOfLastItem = chat.at(-1)?.headers;

		expect(chat).toHaveLength(4);
		// 'set' rather than 'from-the-credential': the item's own header wins the same name
		expect(retryOfLastItem?.get('x-item-1')).toBe('set');
		expect(retryOfLastItem?.get('x-item-0')).toBeNull();
		expect(retryOfLastItem?.get('authorization')).toBe(`Bearer token-${minted}`);
	});
});

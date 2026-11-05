import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { accumulateTokenUsage } from 'n8n-workflow';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { OpenAI } from 'openai';
import type { Mocked } from 'vitest';

import { CustomModelEndpoint } from '../CustomModelEndpoint.node';

import { createCustomModelEndpointConfig } from '@utils/custom-model-endpoint/gateway-config';

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
const transportHeaders = () =>
	vi.mocked(createCustomModelEndpointConfig).mock.calls[0][2].requestHeaders;

describe('CustomModelEndpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		create = vi.fn().mockResolvedValue(answer());
		// A constructor, not an arrow: the node calls `new OpenAI(...)`
		MockedOpenAI.mockImplementation(function () {
			return { chat: { completions: { create } } } as unknown as OpenAI;
		});
	});

	it('reaches the gateway through the shared transport, never its own default host', async () => {
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

	it('puts per-request headers on the request, not on the transport', async () => {
		await run({
			'headers.header': [
				{ name: 'x-tenant', value: 'acme' },
				{ name: BLANK, value: 'dropped' },
			],
		});

		expect(sentOptions().headers).toEqual({ 'x-tenant': 'acme' });
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

	it('builds one client for the whole run so connections are reused', async () => {
		await run({}, 3);

		expect(MockedOpenAI).toHaveBeenCalledTimes(1);
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
});

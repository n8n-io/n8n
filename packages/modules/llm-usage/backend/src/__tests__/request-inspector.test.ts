import {
	setLlmCallGuard,
	setLlmUsageSink,
	type LlmCallContext,
	type LlmUsageRecord,
} from '@n8n/ai-utilities/llm-usage';

import { inspectRequest } from '../request-inspector';

describe('inspectRequest', () => {
	const context: LlmCallContext = { callerType: 'node', workflowId: 'wf-1', nodeName: 'HTTP' };
	let records: LlmUsageRecord[];

	beforeEach(() => {
		records = [];
		setLlmUsageSink({ write: (record) => records.push(record) });
	});

	afterEach(() => {
		setLlmUsageSink(undefined);
	});

	it.each([
		['OpenAI chat', { model: 'gpt-x', messages: [] }],
		['OpenAI Responses', { model: 'gpt-x', input: 'hi' }],
		['completion', { model: 'gpt-x', prompt: 'hi' }],
		['completion with a prompt list', { model: 'gpt-x', prompt: ['hi', 'there'] }],
		['Anthropic', { model: 'claude-x', messages: [], max_tokens: 10 }],
		['Gemini', { contents: [{ parts: [{ text: 'hi' }] }] }],
		['a JSON string body', JSON.stringify({ model: 'gpt-x', messages: [] })],
	])('detects an LLM request: %s', (_name, requestBody) => {
		expect(inspectRequest({ context, credentialTypes: [], requestBody })).toBeDefined();
	});

	it.each([
		['no body', undefined],
		['a model without a prompt', { model: 'gpt-x' }],
		['an unrelated API', { name: 'x', messages: 'not a list' }],
		['plain text', 'hello'],
	])('ignores a non-LLM request: %s', (_name, requestBody) => {
		expect(inspectRequest({ context, credentialTypes: [], requestBody })).toBeUndefined();
	});

	it('does not parse a JSON string body without an LLM key', () => {
		const parse = vi.spyOn(JSON, 'parse');
		const requestBody = JSON.stringify({
			items: Array.from({ length: 1_000 }, (_, id) => ({ id })),
		});

		expect(inspectRequest({ context, credentialTypes: [], requestBody })).toBeUndefined();
		expect(parse).not.toHaveBeenCalled();
		parse.mockRestore();
	});

	it('reports a parsed response with the explicit context', () => {
		const inspector = inspectRequest({
			context,
			credentialTypes: [],
			requestBody: { model: 'gpt-x', messages: [] },
		});

		inspector?.onResponse({ id: 'chatcmpl-1', usage: { prompt_tokens: 11, completion_tokens: 7 } });

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			provider: 'openai',
			model: 'gpt-x',
			providerResponseId: 'chatcmpl-1',
			inputTokens: 11,
			outputTokens: 7,
			subType: 'http',
			context: expect.objectContaining({ workflowId: 'wf-1' }),
		});
	});

	it('reports a streamed response once, at the end', () => {
		const inspector = inspectRequest({
			context,
			credentialTypes: [],
			requestBody: { model: 'gpt-x', messages: [] },
		});

		inspector?.onStreamChunk(Buffer.from('data: {"id":"c","usage":{"prompt_tokens":1,'));
		inspector?.onStreamChunk(Buffer.from('"completion_tokens":2}}\n\ndata: [DONE]\n\n'));
		expect(records).toHaveLength(0);
		inspector?.onStreamEnd();

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ inputTokens: 1, outputTokens: 2 });
	});

	it('reports nothing when the response has no usage', () => {
		inspectRequest({
			context,
			credentialTypes: [],
			requestBody: { model: 'gpt-x', messages: [] },
		})?.onResponse({
			ok: 1,
		});

		expect(records).toHaveLength(0);
	});
});

describe('inspectRequest provider', () => {
	let records: LlmUsageRecord[];

	beforeEach(() => {
		records = [];
		setLlmUsageSink({ write: (record) => records.push(record) });
	});

	afterEach(() => setLlmUsageSink(undefined));

	const respond = (...credentialTypes: string[]) =>
		inspectRequest({
			context: { callerType: 'node' },
			credentialTypes,
			requestBody: { model: 'kimi-k3', messages: [] },
		})?.onResponse({ id: 'chatcmpl-1', usage: { prompt_tokens: 1, completion_tokens: 1 } });

	it('takes the provider from the credential type, since many providers answer in the OpenAI format', () => {
		respond('moonshotApi');
		respond('httpHeaderAuth', 'googlePalmApi');

		expect(records.map((record) => record.provider)).toEqual(['moonshot', 'google']);
	});

	it('keeps the provider of an Anthropic response, whatever the credential', () => {
		inspectRequest({
			context: { callerType: 'node' },
			credentialTypes: ['azureEntraCognitiveServicesOAuth2Api'],
			requestBody: { model: 'claude-x', messages: [] },
		})?.onResponse({
			id: 'msg_1',
			type: 'message',
			model: 'claude-x',
			usage: { input_tokens: 1, output_tokens: 1 },
		});

		expect(records.map((record) => record.provider)).toEqual(['anthropic']);
	});

	it('keeps the provider of the response format for a generic credential', () => {
		respond('httpHeaderAuth');
		respond();

		expect(records.map((record) => record.provider)).toEqual(['openai', 'openai']);
	});

	it('checks the call with its credential, the credential provider and the requested model', async () => {
		const guard = vi.fn().mockResolvedValue(undefined);
		setLlmCallGuard(guard);

		const context: LlmCallContext = { callerType: 'node', workflowId: 'wf-1' };
		try {
			await inspectRequest({
				context,
				credentialTypes: ['deepSeekApi'],
				credentials: { deepSeekApi: { id: 'cred-1' } },
				requestBody: { model: 'deepseek-chat', messages: [] },
			})?.check();
		} finally {
			setLlmCallGuard(undefined);
		}

		expect(guard).toHaveBeenCalledWith({
			context,
			credential: { id: 'cred-1' },
			provider: 'deepseek',
			model: 'deepseek-chat',
		});
	});

	it('blocks with the message only, so a node does not read the policy status as an HTTP 403', async () => {
		const blocked = Object.assign(new Error('LLM budget "Daily" reached'), { errorCode: 403 });
		setLlmCallGuard(async () => await Promise.reject(blocked));

		try {
			const check = inspectRequest({
				context: { callerType: 'node' },
				credentialTypes: [],
				requestBody: { model: 'gpt-x', messages: [] },
			})?.check();
			await expect(check).rejects.toThrow('LLM budget "Daily" reached');
			await expect(check).rejects.not.toHaveProperty('errorCode');
		} finally {
			setLlmCallGuard(undefined);
		}
	});

	it('records the credential that the helper authenticates with, else the only LLM one', () => {
		const call = (
			credentials: Record<string, { id: string | null; __aiGatewayManaged?: boolean }>,
			credentialType?: string,
		) =>
			inspectRequest({
				context: { callerType: 'node' },
				credentialTypes: Object.keys(credentials),
				credentials,
				credentialType,
				requestBody: { model: 'gpt-x', messages: [] },
			})?.onResponse({ id: 'chatcmpl-1', usage: { prompt_tokens: 1, completion_tokens: 1 } });

		call(
			{ openAiApi: { id: 'cred-openai' }, httpHeaderAuth: { id: 'cred-header' } },
			'httpHeaderAuth',
		);
		call({ openAiApi: { id: 'cred-openai' }, httpHeaderAuth: { id: 'cred-header' } });
		call({ openAiApi: { id: null, __aiGatewayManaged: true } });

		expect(records.map((record) => record.credential)).toEqual([
			{ id: 'cred-header' },
			{ id: 'cred-openai' },
			{ managedBy: 'aiGateway' },
		]);
	});
});

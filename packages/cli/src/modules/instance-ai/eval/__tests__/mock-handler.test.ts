interface MockResponseSpec {
	type: 'json' | 'binary' | 'error';
	body?: unknown;
	statusCode?: number;
	contentType?: string;
	filename?: string;
}

const submitQueue: MockResponseSpec[] = [];
const generateOverride: { fn?: () => Promise<unknown> } = {};
const submitCapture: { handler?: (input: MockResponseSpec) => Promise<unknown> } = {};

const mockGenerate = jest.fn(async () => {
	if (generateOverride.fn) return await generateOverride.fn();
	const next = submitQueue.shift();
	if (next && submitCapture.handler) {
		await submitCapture.handler(next);
	}
	return { messages: [], finishReason: 'tool-calls' };
});

const mockAgent = {
	tool: jest.fn(function (
		this: typeof mockAgent,
		builtTool: { _name?: string; _handler?: unknown },
	) {
		if (builtTool._name === 'submit_response') {
			submitCapture.handler = builtTool._handler as (input: MockResponseSpec) => Promise<unknown>;
		}
		return this;
	}),
	providerTool: jest.fn().mockReturnThis(),
	generate: mockGenerate,
};
const mockExtractText = jest.fn((result: { _text?: string }) => result._text ?? '');

jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: jest.fn(() => mockAgent),
	extractText: mockExtractText,
	Tool: jest.fn().mockImplementation((name: string) => {
		const built: { _name: string; _handler?: unknown } = { _name: name };
		const builder = {
			description: jest.fn().mockReturnThis(),
			input: jest.fn().mockReturnThis(),
			handler: jest.fn(function (this: unknown, h: unknown) {
				built._handler = h;
				return this;
			}),
			build: jest.fn(() => built),
		};
		return builder;
	}),
	providerTools: {
		anthropicWebSearch: jest.fn(() => ({ name: 'anthropic.web_search_20250305', args: {} })),
	},
}));

jest.mock('../node-config', () => ({
	extractNodeConfig: jest.fn().mockReturnValue('{}'),
}));

jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn().mockReturnValue({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		}),
	},
}));

import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import { createLlmMockHandler } from '../mock-handler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function llmSubmits(spec: MockResponseSpec) {
	submitQueue.push(spec);
}

function llmDoesNotSubmit(text = '') {
	generateOverride.fn = async () => ({ messages: [], finishReason: 'stop', _text: text });
}

function llmRejects(error: Error) {
	generateOverride.fn = async () => {
		throw error;
	};
}

const baseRequest = {
	url: 'https://api.slack.com/chat.postMessage',
	method: 'POST',
} as IHttpRequestOptions;
const baseNode = { name: 'Slack', type: 'n8n-nodes-base.slack' } as INode;

async function callHandler(
	handler: ReturnType<typeof createLlmMockHandler>,
	request = baseRequest,
	node = baseNode,
) {
	const result = await handler(request, node);
	if (!result) throw new Error('Expected mock handler to return a response');
	return result;
}

beforeEach(() => {
	jest.clearAllMocks();
	submitQueue.length = 0;
	generateOverride.fn = undefined;
	submitCapture.handler = undefined;
});

// ---------------------------------------------------------------------------
// createLlmMockHandler — response materialization via submit_response tool
// ---------------------------------------------------------------------------

describe('createLlmMockHandler', () => {
	it('should return a function', () => {
		const handler = createLlmMockHandler();
		expect(typeof handler).toBe('function');
	});

	it('should materialize JSON spec submitted via submit_response', async () => {
		llmSubmits({ type: 'json', body: { id: 1, ok: true } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { id: 1, ok: true },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should default json body to { ok: true } when body is omitted', async () => {
		llmSubmits({ type: 'json' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { ok: true },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should materialize binary spec with Buffer body', async () => {
		llmSubmits({ type: 'binary', contentType: 'application/pdf', filename: 'doc.pdf' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/pdf');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		expect((result.body as Buffer).toString()).toContain('doc.pdf');
	});

	it('should use default filename and content-type for binary when omitted', async () => {
		llmSubmits({ type: 'binary' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/octet-stream');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		expect((result.body as Buffer).toString()).toContain('mock-file.dat');
	});

	it('should materialize error spec with correct status code', async () => {
		llmSubmits({ type: 'error', statusCode: 404, body: { error: 'not found' } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { error: 'not found' },
			headers: { 'content-type': 'application/json' },
			statusCode: 404,
		});
	});

	it('should default error status code to 500 when omitted', async () => {
		llmSubmits({ type: 'error' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { error: 'Mock error' },
			headers: { 'content-type': 'application/json' },
			statusCode: 500,
		});
	});

	it('should return _evalMockError when agent does not call submit_response', async () => {
		llmDoesNotSubmit('I cannot generate this response');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: expect.objectContaining({ _evalMockError: true }),
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should return _evalMockError when agent.generate rejects', async () => {
		llmRejects(new Error('LLM timeout'));
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: expect.objectContaining({
				_evalMockError: true,
				message: expect.stringContaining('LLM timeout'),
			}),
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should cache node config across calls for the same node name', async () => {
		const { extractNodeConfig } = require('../node-config') as {
			extractNodeConfig: jest.Mock;
		};
		extractNodeConfig.mockReturnValue('{"resource":"message"}');

		llmSubmits({ type: 'json', body: { ok: true } });
		llmSubmits({ type: 'json', body: { ok: true } });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);
		await handler(baseRequest, baseNode);

		expect(extractNodeConfig).toHaveBeenCalledTimes(1);
	});

	it('should extract config separately for different node names', async () => {
		const { extractNodeConfig } = require('../node-config') as {
			extractNodeConfig: jest.Mock;
		};
		extractNodeConfig.mockReturnValue('{}');

		llmSubmits({ type: 'json', body: {} });
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, { name: 'Slack', type: 'n8n-nodes-base.slack' } as INode);
		await handler(baseRequest, { name: 'Gmail', type: 'n8n-nodes-base.gmail' } as INode);

		expect(extractNodeConfig).toHaveBeenCalledTimes(2);
	});
});

// ---------------------------------------------------------------------------
// Prompt construction — verify request details reach the agent
// ---------------------------------------------------------------------------

describe('prompt construction', () => {
	it('should include request body in prompt', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/chat.postMessage', method: 'POST', body: { text: 'hi' } },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('"text":"hi"');
	});

	it('should include query string in prompt', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/channels', method: 'GET', qs: { limit: 10 } },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('"limit":10');
	});

	it('should include scenario hints when provided', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler({ scenarioHints: 'return rate-limited error' });

		await handler(baseRequest, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('return rate-limited error');
	});

	it('should include global context and node hints when provided', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler({
			globalContext: 'project-id=abc123',
			nodeHints: { Slack: 'channel=#general' },
		});

		await handler(baseRequest, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('project-id=abc123');
		expect(prompt).toContain('channel=#general');
	});

	it('should include current date/time in prompt', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('Current date/time:');
	});

	it('should add GraphQL format guidance for /graphql endpoints', async () => {
		llmSubmits({ type: 'json', body: { data: { viewer: { id: '1' } } } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.github.com/graphql',
				method: 'POST',
				body: { query: '{ viewer { id } }' },
			} as IHttpRequestOptions,
			{ name: 'GitHub', type: 'n8n-nodes-base.github' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('GraphQL');
	});

	it('should add GraphQL format guidance when body contains query field', async () => {
		llmSubmits({ type: 'json', body: { data: {} } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.linear.app/v1',
				method: 'POST',
				body: { query: '{ issues { nodes { id } } }' },
			} as IHttpRequestOptions,
			{ name: 'Linear', type: 'n8n-nodes-base.httpRequest' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('GraphQL');
	});

	it('should default method to GET when not specified', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/channels' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('GET');
	});
});

// ---------------------------------------------------------------------------
// extractServiceName — tested indirectly through prompt content
// ---------------------------------------------------------------------------

describe('service name extraction (via prompt)', () => {
	it('should extract "Slack" from api.slack.com', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/chat.postMessage' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('Service: Slack');
	});

	it('should extract "Googleapis" from www.googleapis.com', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://www.googleapis.com/sheets/v4/spreadsheets' } as IHttpRequestOptions,
			{ name: 'Sheets', type: 'n8n-nodes-base.googleSheets' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('Service: Googleapis');
	});

	it('should return "Unknown" for invalid URLs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('Service: Unknown');
	});
});

// ---------------------------------------------------------------------------
// extractEndpoint — tested indirectly through prompt content
// ---------------------------------------------------------------------------

describe('endpoint extraction (via prompt)', () => {
	it('should extract path and query from URL', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/conversations.list?limit=100&cursor=abc' },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('/conversations.list?limit=100&cursor=abc');
	});

	it('should extract path without query when there is none', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/chat.postMessage' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('/chat.postMessage');
		const match = prompt.match(/(?:GET|POST)\s+(\S+)/);
		expect(match?.[1]).not.toContain('?');
	});

	it('should fall back to raw url for invalid URLs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url', method: 'GET' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0] as unknown as string;
		expect(prompt).toContain('GET not-a-url');
	});
});

const mockGenerate = jest.fn();
const mockAgent = { tool: jest.fn().mockReturnThis(), generate: mockGenerate };
const mockExtractText = jest.fn((result: { _text?: string }) => result._text ?? '');

jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: jest.fn(() => mockAgent),
	extractText: mockExtractText,
	Tool: jest.fn().mockImplementation(() => ({
		description: jest.fn().mockReturnThis(),
		input: jest.fn().mockReturnThis(),
		handler: jest.fn().mockReturnThis(),
		build: jest.fn().mockReturnValue({}),
	})),
}));

jest.mock('../api-docs', () => ({ fetchApiDocs: jest.fn() }));

jest.mock('../node-config', () => ({
	extractNodeConfig: jest.fn().mockReturnValue('{}'),
}));

jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn().mockReturnValue({
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

function llmReturns(text: string) {
	mockGenerate.mockResolvedValue({ _text: text, messages: [] });
}

function llmRejects(error: Error) {
	mockGenerate.mockRejectedValue(error);
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
});

// ---------------------------------------------------------------------------
// createLlmMockHandler — response materialization via agent mock
// ---------------------------------------------------------------------------

describe('createLlmMockHandler', () => {
	it('should return a function', () => {
		const handler = createLlmMockHandler();
		expect(typeof handler).toBe('function');
	});

	it('should materialize clean JSON spec', async () => {
		llmReturns('{ "type": "json", "body": { "id": 1, "ok": true } }');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { id: 1, ok: true },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should parse JSON from fenced code block', async () => {
		llmReturns('```json\n{"type":"json","body":{"ok":true}}\n```');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { ok: true },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should parse JSON from fenced block without language tag', async () => {
		llmReturns('```\n{"type":"json","body":{"data":[]}}\n```');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { data: [] },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should extract JSON wrapped in prose', async () => {
		llmReturns('Based on the API docs, here is the response: {"type":"json","body":{"data":[]}}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { data: [] },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should default to json type when type field is missing', async () => {
		llmReturns('{"body":{"id":1}}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		// When type is missing, parseResponseText wraps the whole parsed object as body
		expect(result).toEqual({
			body: { body: { id: 1 } },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should default to json type when type field is unrecognized', async () => {
		llmReturns('{"type":"xml","body":{"id":1}}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		// Unrecognized type wraps the entire parsed object as body
		expect(result).toEqual({
			body: { type: 'xml', body: { id: 1 } },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should return _evalMockError on unparseable text', async () => {
		llmReturns('I cannot generate this response');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: expect.objectContaining({ _evalMockError: true }),
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should materialize binary spec with Buffer body', async () => {
		llmReturns('{"type":"binary","contentType":"application/pdf","filename":"doc.pdf"}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/pdf');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		expect((result.body as Buffer).toString()).toContain('doc.pdf');
	});

	it('should use default filename and content-type for binary when omitted', async () => {
		llmReturns('{"type":"binary"}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/octet-stream');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		expect((result.body as Buffer).toString()).toContain('mock-file.dat');
	});

	it('should materialize error spec with correct status code', async () => {
		llmReturns('{"type":"error","statusCode":404,"body":{"error":"not found"}}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { error: 'not found' },
			headers: { 'content-type': 'application/json' },
			statusCode: 404,
		});
	});

	it('should default error status code to 500 when omitted', async () => {
		llmReturns('{"type":"error"}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { error: 'Mock error' },
			headers: { 'content-type': 'application/json' },
			statusCode: 500,
		});
	});

	it('should default json body to { ok: true } when body is omitted', async () => {
		llmReturns('{"type":"json"}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { ok: true },
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

		llmReturns('{"type":"json","body":{"ok":true}}');
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

		llmReturns('{"type":"json","body":{}}');
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
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/chat.postMessage', method: 'POST', body: { text: 'hi' } },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"text":"hi"');
	});

	it('should include query string in prompt', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/channels', method: 'GET', qs: { limit: 10 } },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"limit":10');
	});

	it('should include scenario hints when provided', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler({ scenarioHints: 'return rate-limited error' });

		await handler(baseRequest, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('return rate-limited error');
	});

	it('should include global context and node hints when provided', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler({
			globalContext: 'project-id=abc123',
			nodeHints: { Slack: 'channel=#general' },
		});

		await handler(baseRequest, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('project-id=abc123');
		expect(prompt).toContain('channel=#general');
	});

	it('should add GraphQL format guidance for /graphql endpoints', async () => {
		llmReturns('{"type":"json","body":{"data":{"viewer":{"id":"1"}}}}');
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.github.com/graphql',
				method: 'POST',
				body: { query: '{ viewer { id } }' },
			} as IHttpRequestOptions,
			{ name: 'GitHub', type: 'n8n-nodes-base.github' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GraphQL');
	});

	it('should add GraphQL format guidance when body contains query field', async () => {
		llmReturns('{"type":"json","body":{"data":{}}}');
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.linear.app/v1',
				method: 'POST',
				body: { query: '{ issues { nodes { id } } }' },
			} as IHttpRequestOptions,
			{ name: 'Linear', type: 'n8n-nodes-base.httpRequest' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GraphQL');
	});

	it('should default method to GET when not specified', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/channels' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GET');
	});
});

// ---------------------------------------------------------------------------
// Edge cases for JSON extraction
// ---------------------------------------------------------------------------

describe('JSON extraction edge cases', () => {
	it('should handle JSON with nested braces in string values', async () => {
		llmReturns('Here: {"type":"json","body":{"msg":"value with {braces}"}}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.body).toEqual({ msg: 'value with {braces}' });
		expect(result.statusCode).toBe(200);
	});

	it('should handle extra whitespace around fenced blocks', async () => {
		llmReturns('  ```json  \n  {"type":"json","body":{"ok":true}}  \n  ```  ');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.body).toEqual({ ok: true });
	});

	it('should handle a raw object without type as entire body', async () => {
		// When the LLM returns a plain object that isn't a spec, the whole thing becomes the body
		llmReturns('{"id": 42, "name": "test"}');
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { id: 42, name: 'test' },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});
});

// ---------------------------------------------------------------------------
// extractServiceName — tested indirectly through prompt content
// ---------------------------------------------------------------------------

describe('service name extraction (via prompt)', () => {
	it('should extract "Slack" from api.slack.com', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/chat.postMessage' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('Service: Slack');
	});

	it('should extract "Googleapis" from www.googleapis.com', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://www.googleapis.com/sheets/v4/spreadsheets' } as IHttpRequestOptions,
			{ name: 'Sheets', type: 'n8n-nodes-base.googleSheets' } as INode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('Service: Googleapis');
	});

	it('should return "Unknown" for invalid URLs', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('Service: Unknown');
	});
});

// ---------------------------------------------------------------------------
// extractEndpoint — tested indirectly through prompt content
// ---------------------------------------------------------------------------

describe('endpoint extraction (via prompt)', () => {
	it('should extract path and query from URL', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/conversations.list?limit=100&cursor=abc' },
			baseNode,
		);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('/conversations.list?limit=100&cursor=abc');
	});

	it('should extract path without query when there is none', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/chat.postMessage' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('/chat.postMessage');
		// Should not have a '?' in the endpoint portion
		const match = prompt.match(/(?:GET|POST)\s+(\S+)/);
		expect(match?.[1]).not.toContain('?');
	});

	it('should fall back to raw url for invalid URLs', async () => {
		llmReturns('{"type":"json","body":{}}');
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url', method: 'GET' }, baseNode);

		const prompt: string = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GET not-a-url');
	});
});

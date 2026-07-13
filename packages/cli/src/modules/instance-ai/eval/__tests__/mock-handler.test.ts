interface MockResponseSpec {
	type: 'json' | 'text' | 'binary' | 'error';
	body?: unknown;
	textBody?: string;
	statusCode?: number;
	contentType?: string;
	filename?: string;
	sizeHint?: 'small' | 'medium' | 'large';
}

interface MockAgent {
	tool: Mock;
	generate: Mock;
}

// Hoisted so the `vi.mock('@n8n/instance-ai')` factory below (which references
// mockAgent/mockExtractText) can resolve them — vi.mock factories are hoisted
// above all module-level statements.
const {
	submitQueue,
	generateOverride,
	submitCapture,
	quirksCapture,
	mockGenerate,
	mockAgent,
	mockExtractText,
} = vi.hoisted(() => {
	const submitQueue: MockResponseSpec[] = [];
	const generateOverride: { fn?: () => Promise<unknown> } = {};
	const submitCapture: { handler?: (input: MockResponseSpec) => Promise<unknown> } = {};
	const quirksCapture: { handler?: () => Promise<string> } = {};

	const mockGenerate = vi.fn(async (_prompt: string) => {
		if (generateOverride.fn) return await generateOverride.fn();
		const next = submitQueue.shift();
		if (next && submitCapture.handler) {
			await submitCapture.handler(next);
		}
		return { messages: [], finishReason: 'tool-calls' };
	});

	const mockAgent: MockAgent = {
		tool: vi.fn(function (this: MockAgent, builtTool: { _name?: string; _handler?: unknown }) {
			if (builtTool._name === 'submit_response') {
				submitCapture.handler = builtTool._handler as (input: MockResponseSpec) => Promise<unknown>;
			} else if (builtTool._name === 'get_endpoint_quirks') {
				quirksCapture.handler = builtTool._handler as () => Promise<string>;
			}
			return this;
		}),
		generate: mockGenerate,
	};

	const mockExtractText = vi.fn((result: { _text?: string }) => result._text ?? '');

	return {
		submitQueue,
		generateOverride,
		submitCapture,
		quirksCapture,
		mockGenerate,
		mockAgent,
		mockExtractText,
	};
});
const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => mockAgent),
	extractText: mockExtractText,
	Tool: vi.fn().mockImplementation(function (name: string) {
		const built: { _name: string; _handler?: unknown } = { _name: name };
		const builder = {
			description: vi.fn().mockReturnThis(),
			input: vi.fn().mockReturnThis(),
			handler: vi.fn(function (this: unknown, h: unknown) {
				built._handler = h;
				return this;
			}),
			build: vi.fn(() => built),
		};
		return builder;
	}),
}));

vi.mock('../api-docs', () => ({ fetchApiDocs: vi.fn().mockResolvedValue('') }));

vi.mock('../node-config', () => ({
	extractNodeConfig: vi.fn().mockReturnValue('{}'),
}));

vi.mock('@n8n/di', () => ({
	Container: {
		get: vi.fn().mockReturnValue({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		}),
	},
	// No-op decorator factory so n8n-core's @Service-decorated classes load
	// without registering against a real DI container.
	Service: () => (target: unknown) => target,
}));

import type { Mock } from 'vitest';
import { Container } from '@n8n/di';
import { createEvalAgent, Tool } from '@n8n/instance-ai';
import { fileTypeFromBuffer } from 'file-type';
import FormData from 'form-data';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import { fetchApiDocs } from '../api-docs';
import {
	buildDateAnchors,
	createLlmMockHandler,
	extractDateFilterConstraints,
	findDateFilterViolations,
} from '../mock-handler';
import { extractNodeConfig } from '../node-config';

// `restoreMocks: true` in the root vi.config wipes `.mockImplementation` set
// inside vi.mock factories before every test, so re-apply the mocks that
// matter for tests to pass. Keep in sync with the factory bodies above.
function reapplyMockImplementations() {
	vi.mocked(Container.get).mockReturnValue(mockLogger);
	vi.mocked(fetchApiDocs).mockResolvedValue('');
	vi.mocked(extractNodeConfig).mockReturnValue('{}');
	vi.mocked(createEvalAgent).mockReturnValue(mockAgent as never);
	vi.mocked(Tool).mockImplementation(function (name: string) {
		const built: { _name: string; _handler?: unknown } = { _name: name };
		const builder = {
			description: vi.fn().mockReturnThis(),
			input: vi.fn().mockReturnThis(),
			handler: vi.fn(function (this: unknown, h: unknown) {
				built._handler = h;
				return this;
			}),
			build: vi.fn(() => built),
		};
		return builder;
	} as never);
	mockAgent.tool.mockImplementation(function (
		this: MockAgent,
		builtTool: { _name?: string; _handler?: unknown },
	) {
		if (builtTool._name === 'submit_response') {
			submitCapture.handler = builtTool._handler as (input: MockResponseSpec) => Promise<unknown>;
		} else if (builtTool._name === 'get_endpoint_quirks') {
			quirksCapture.handler = builtTool._handler as () => Promise<string>;
		}
		return this;
	});
	mockGenerate.mockImplementation(async function (_prompt: string) {
		if (generateOverride.fn) return await generateOverride.fn();
		const next = submitQueue.shift();
		if (next && submitCapture.handler) {
			await submitCapture.handler(next);
		}
		return { messages: [], finishReason: 'tool-calls' };
	});
	mockExtractText.mockImplementation(function (result: { _text?: string }) {
		return result._text ?? '';
	});
}

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
	vi.clearAllMocks();
	reapplyMockImplementations();
	submitQueue.length = 0;
	generateOverride.fn = undefined;
	submitCapture.handler = undefined;
	quirksCapture.handler = undefined;
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

	it('should preserve an explicit null body (204/202-style empty payload)', async () => {
		llmSubmits({ type: 'json', body: null });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: null,
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
	});

	it('should materialize binary spec with a valid PDF fixture when contentType=application/pdf', async () => {
		llmSubmits({ type: 'binary', contentType: 'application/pdf', filename: 'doc.pdf' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/pdf');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		const sniffed = await fileTypeFromBuffer(result.body as Buffer);
		expect(sniffed?.mime).toBe('application/pdf');
		expect(sniffed?.ext).toBe('pdf');
	});

	it('should populate content-disposition and content-length headers for binary responses', async () => {
		llmSubmits({ type: 'binary', contentType: 'image/png', filename: 'logo.png' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.headers['content-disposition']).toBe('attachment; filename="logo.png"');
		expect(result.headers['content-length']).toBe(String((result.body as Buffer).length));
	});

	it('should respect sizeHint=medium for binary responses', async () => {
		llmSubmits({
			type: 'binary',
			contentType: 'application/pdf',
			filename: 'big.pdf',
			sizeHint: 'medium',
		});
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect((result.body as Buffer).length).toBeGreaterThanOrEqual(64 * 1024);
	});

	it('should use default filename and content-type for binary when omitted', async () => {
		llmSubmits({ type: 'binary' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.statusCode).toBe(200);
		expect(result.headers['content-type']).toBe('application/octet-stream');
		expect(result.headers['content-disposition']).toBe('attachment; filename="mock-file.dat"');
		expect(Buffer.isBuffer(result.body)).toBe(true);
		expect((result.body as Buffer).length).toBeGreaterThan(0);
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

	it('should materialize text spec as a raw string body with the given content type', async () => {
		const soap =
			'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetQuoteResponse><Price>42.5</Price></GetQuoteResponse></soap:Body></soap:Envelope>';
		llmSubmits({ type: 'text', textBody: soap, contentType: 'text/xml' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: soap,
			headers: { 'content-type': 'text/xml' },
			statusCode: 200,
		});
		expect(typeof result.body).toBe('string');
	});

	it('should default text content type to text/plain when omitted', async () => {
		llmSubmits({ type: 'text', textBody: 'id,name\n1,Jane' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: 'id,name\n1,Jane',
			headers: { 'content-type': 'text/plain' },
			statusCode: 200,
		});
	});

	it('should materialize error spec with a text document body when textBody is provided', async () => {
		const fault =
			'<?xml version="1.0"?><soap:Fault><faultcode>soap:Client</faultcode></soap:Fault>';
		llmSubmits({ type: 'error', statusCode: 500, textBody: fault, contentType: 'text/xml' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: fault,
			headers: { 'content-type': 'text/xml' },
			statusCode: 500,
		});
	});

	it('should not capture a text spec missing textBody and succeed on the retry submission', async () => {
		llmSubmits({ type: 'text', contentType: 'text/xml' });
		llmSubmits({ type: 'text', textBody: '<ok/>', contentType: 'text/xml' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: '<ok/>',
			headers: { 'content-type': 'text/xml' },
			statusCode: 200,
		});
	});

	it('should return corrective messages from the submit handler for invalid cross-field specs', async () => {
		llmSubmits({ type: 'json', body: { ok: true } });
		const handler = createLlmMockHandler();
		await callHandler(handler);

		const submitHandler = submitCapture.handler;
		if (!submitHandler) throw new Error('submit_response handler was not captured');

		await expect(submitHandler({ type: 'text', contentType: 'text/xml' })).resolves.toContain(
			'requires textBody',
		);
		await expect(submitHandler({ type: 'json', textBody: '<oops/>' })).resolves.toContain(
			'not allowed with type="json"',
		);
		await expect(
			submitHandler({ type: 'text', textBody: '<html>503</html>', statusCode: 503 }),
		).resolves.toContain('resubmit with type="error"');
		await expect(
			submitHandler({ type: 'text', textBody: '{"items": [1, 2]}', contentType: 'text/plain' }),
		).resolves.toContain('looks like a JSON response');
		await expect(
			submitHandler({ type: 'text', textBody: '<ok/>', contentType: 'application/json' }),
		).resolves.toContain('looks like a JSON response');
		await expect(
			submitHandler({
				type: 'error',
				statusCode: 429,
				body: { error: 'rate limited' },
				textBody: 'Too Many Requests',
			}),
		).resolves.toContain('not both');
	});

	it('should fall back to a soft-captured json body when the model never resubmits after a json+textBody rejection', async () => {
		llmSubmits({ type: 'json', body: { id: 7 }, textBody: '<stray/>' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result).toEqual({
			body: { id: 7 },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		});
		// The fallback is observable: serving a rejected, never-resubmitted spec warns.
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('soft-captured'));
	});

	it('should not warn when an accepted submission is served', async () => {
		llmSubmits({ type: 'json', body: { ok: true } });
		const handler = createLlmMockHandler();
		await callHandler(handler);

		expect(mockLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('soft-captured'));
	});

	it('should surface the rejection reason when a rejected spec is never resubmitted', async () => {
		// One rejected submission per attempt (initial + DEFAULT_MAX_RETRIES).
		llmSubmits({ type: 'text', contentType: 'text/xml' });
		llmSubmits({ type: 'text', contentType: 'text/xml' });
		llmSubmits({ type: 'text', contentType: 'text/xml' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.body).toEqual(
			expect.objectContaining({
				_evalMockError: true,
				message: expect.stringContaining('rejected'),
			}),
		);
	});

	it('should default text content type to text/plain when contentType is an empty string', async () => {
		llmSubmits({ type: 'text', textBody: '<rss/>', contentType: '' });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		expect(result.headers['content-type']).toBe('text/plain');
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
		const { extractNodeConfig } = (await import('../node-config')) as unknown as {
			extractNodeConfig: Mock;
		};
		extractNodeConfig.mockReturnValue('{"resource":"message"}');

		llmSubmits({ type: 'json', body: { ok: true } });
		llmSubmits({ type: 'json', body: { ok: true } });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);
		await handler(baseRequest, baseNode);

		expect(extractNodeConfig).toHaveBeenCalledTimes(1);
	});

	it('serves identical repeats from cache with isolated body copies', async () => {
		llmSubmits({ type: 'json', body: { items: [{ id: 1 }] } });
		const handler = createLlmMockHandler();

		const first = await callHandler(handler);
		// Simulate node code reshaping the response body in place.
		(first.body as { items: unknown[] }).items.push({ id: 'mutated' });

		const second = await callHandler(handler);

		// One LLM round-trip — the repeat was a cache hit …
		expect(mockGenerate).toHaveBeenCalledTimes(1);
		// … but the first caller's mutation must not leak into it.
		expect(second.body).toEqual({ items: [{ id: 1 }] });
		expect(second.body).not.toBe(first.body);
	});

	it('evicts a soft-fallback response so the next identical request regenerates', async () => {
		// json + textBody soft-captures the spec and rejects it; the agent never
		// resubmits, so the first response is served as a soft fallback.
		llmSubmits({ type: 'json', body: { stale: true }, textBody: 'not allowed with json' });
		llmSubmits({ type: 'json', body: { fresh: true } });
		const handler = createLlmMockHandler();

		const first = await callHandler(handler);
		expect(first.body).toEqual({ stale: true });

		// The soft fallback must not be cached — the identical repeat regenerates.
		const second = await callHandler(handler);
		expect(second.body).toEqual({ fresh: true });
		expect(mockGenerate).toHaveBeenCalledTimes(2);
	});

	it('should extract config separately for different node names', async () => {
		const { extractNodeConfig } = (await import('../node-config')) as unknown as {
			extractNodeConfig: Mock;
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

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"text":"hi"');
	});

	it('should include query string in prompt', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://api.slack.com/channels', method: 'GET', qs: { limit: 10 } },
			baseNode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"limit":10');
	});

	it('should include scenario hints when provided', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler({ scenarioHints: 'return rate-limited error' });

		await handler(baseRequest, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('return rate-limited error');
	});

	it('should include global context and node hints when provided', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler({
			globalContext: 'project-id=abc123',
			nodeHints: { Slack: 'channel=#general' },
		});

		await handler(baseRequest, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('project-id=abc123');
		expect(prompt).toContain('channel=#general');
	});

	it('should include date anchors as the last section so they sit below API docs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('## Date anchors');
		expect(prompt).toMatch(/- today: \d{4}-\d{2}-\d{2}/);
		expect(prompt).toMatch(/- yesterday: \d{4}-\d{2}-\d{2}/);
		expect(prompt).toMatch(/- 14 days ago: \d{4}-\d{2}-\d{2}/);
		expect(prompt.lastIndexOf('## Date anchors')).toBeGreaterThan(
			prompt.lastIndexOf('## API documentation'),
		);
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

		const prompt = mockGenerate.mock.calls[0][0];
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

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GraphQL');
	});

	it('should redact raw Buffer request bodies to size metadata', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.example.com/upload',
				method: 'POST',
				body: Buffer.from('PNG-bytes-would-go-here'),
				headers: { 'content-type': 'image/png' },
			} as unknown as IHttpRequestOptions,
			baseNode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"__redacted":"buffer"');
		expect(prompt).toContain('"contentType":"image/png"');
		expect(prompt).not.toContain('PNG-bytes-would-go-here');
	});

	it('should redact form-data multipart request bodies to part metadata', async () => {
		const fd = new FormData();
		fd.append('caption', 'hello');
		fd.append('file', Buffer.from('binary-data-here'), {
			filename: 'voice.ogg',
			contentType: 'audio/ogg',
		});

		llmSubmits({ type: 'json', body: { ok: true, file_id: 'abc' } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.telegram.org/bot123/sendVoice',
				method: 'POST',
				body: fd,
			} as unknown as IHttpRequestOptions,
			baseNode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('"__redacted":"multipart"');
		expect(prompt).toContain('"name":"caption"');
		expect(prompt).toContain('"name":"file"');
		expect(prompt).toContain('"filename":"voice.ogg"');
		expect(prompt).toContain('"contentType":"audio/ogg"');
		expect(prompt).not.toContain('binary-data-here');
	});

	it('should default method to GET when not specified', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/channels' }, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
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

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('Service: Slack');
	});

	it('should extract "Googleapis" from www.googleapis.com', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(
			{ url: 'https://www.googleapis.com/sheets/v4/spreadsheets' } as IHttpRequestOptions,
			{ name: 'Sheets', type: 'n8n-nodes-base.googleSheets' } as INode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('Service: Googleapis');
	});

	it('should return "Unknown" for invalid URLs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url' }, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
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

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('/conversations.list?limit=100&cursor=abc');
	});

	it('should extract path without query when there is none', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.slack.com/chat.postMessage' }, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('/chat.postMessage');
		const match = prompt.match(/(?:GET|POST)\s+(\S+)/);
		expect(match?.[1]).not.toContain('?');
	});

	it('should fall back to raw url for invalid URLs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'not-a-url', method: 'GET' }, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('GET not-a-url');
	});
});

// ---------------------------------------------------------------------------
// buildDateAnchors — date math used to seed the user prompt
// ---------------------------------------------------------------------------

describe('buildDateAnchors', () => {
	it('renders today plus the standard set of relative anchors', () => {
		const fixed = new Date('2026-05-12T14:30:00.000Z');
		const block = buildDateAnchors(fixed);

		expect(block).toContain('- today: 2026-05-12');
		expect(block).toContain('full timestamp 2026-05-12T14:30:00.000Z');
		expect(block).toContain('- yesterday: 2026-05-11');
		expect(block).toContain('- 7 days ago: 2026-05-05');
		expect(block).toContain('- 14 days ago: 2026-04-28');
		expect(block).toContain('- 30 days ago: 2026-04-12');
		expect(block).toContain('- 1 day from now: 2026-05-13');
		expect(block).toContain('- 7 days from now: 2026-05-19');
	});

	it('uses UTC for date math (avoids local-timezone drift around midnight)', () => {
		// 23:59 UTC on the 12th — local time in many zones would tip to the 13th.
		const fixed = new Date('2026-05-12T23:59:00.000Z');
		const block = buildDateAnchors(fixed);
		expect(block).toContain('- today: 2026-05-12');
		expect(block).toContain('- yesterday: 2026-05-11');
	});
});

// ---------------------------------------------------------------------------
// Request date-filter validation helpers (used by the submit_response
// one-shot rejection)
// ---------------------------------------------------------------------------

describe('date-filter validation helpers', () => {
	const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000);
	const iso = (days: number) => daysFromNow(days).toISOString();

	describe('extractDateFilterConstraints', () => {
		it('extracts GraphQL filter variables (`variables.since` and nested `createdAt.gte`)', () => {
			const body = {
				query: 'query($since: DateTime) { issues(filter: { createdAt: { gte: $since } }) { id } }',
				variables: { since: iso(-14) },
			};
			const constraints = extractDateFilterConstraints(body);
			expect(constraints).toHaveLength(1);
			expect(constraints[0].label).toBe('since');
			expect(constraints[0].min).toBeDefined();
		});

		it('extracts inline nested bounds and query-string params', () => {
			const body = { filter: { createdAt: { gte: iso(-7), lte: iso(0) } } };
			const qs = { after: iso(-30) };
			const constraints = extractDateFilterConstraints(body, qs);
			const labels = constraints.map((c) => c.label).sort();
			expect(labels).toEqual(['after', 'gte', 'lte']);
		});

		it('ignores dates far outside the present (not test windows)', () => {
			const body = { since: '2019-01-01T00:00:00.000Z' };
			expect(extractDateFilterConstraints(body)).toHaveLength(0);
		});
	});

	describe('findDateFilterViolations', () => {
		const constraints = extractDateFilterConstraints({ since: iso(-14) });

		it('flags records dated before the requested window (beyond the 1-day tolerance)', () => {
			const response = {
				issues: [
					{ id: 'issue_001', createdAt: iso(-3) },
					{ id: 'issue_007', createdAt: iso(-21) },
				],
			};
			const violations = findDateFilterViolations(response, constraints);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('createdAt');
		});

		it('accepts in-window records and boundary jitter within the tolerance', () => {
			const response = {
				issues: [
					{ id: 'a', createdAt: iso(-13.5) },
					// half a day older than the bound — inside the ±1 day tolerance
					{ id: 'b', createdAt: iso(-14.5) },
				],
			};
			expect(findDateFilterViolations(response, constraints)).toHaveLength(0);
		});

		it('returns no violations when the request carries no date constraints', () => {
			const response = { issues: [{ id: 'x', createdAt: iso(-100) }] };
			expect(findDateFilterViolations(response, [])).toHaveLength(0);
		});
	});
});

// ---------------------------------------------------------------------------
// get_endpoint_quirks tool — registered alongside submit_response and bound
// to the live request context
// ---------------------------------------------------------------------------

describe('get_endpoint_quirks tool', () => {
	it('is registered on every handler invocation', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await callHandler(handler);

		expect(quirksCapture.handler).toBeDefined();
	});

	it('returns guidance for a known service (Notion)', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.notion.com/v1/pages', method: 'POST' }, {
			name: 'Notion',
			type: 'n8n-nodes-base.notion',
		} as INode);

		expect(quirksCapture.handler).toBeDefined();
		const result = await quirksCapture.handler!();
		expect(result).toMatch(/full|FULL/);
	});

	it('returns the no-quirks message for services without registered quirks', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.github.com/repos/owner/name/issues', method: 'GET' }, {
			name: 'GitHub',
			type: 'n8n-nodes-base.github',
		} as INode);

		expect(quirksCapture.handler).toBeDefined();
		const result = await quirksCapture.handler!();
		expect(result).toContain('No specific quirks');
	});
});

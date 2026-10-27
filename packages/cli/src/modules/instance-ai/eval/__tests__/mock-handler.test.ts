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
}));

vi.mock('@n8n/agents/tool', () => ({
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
import { Tool } from '@n8n/agents/tool';
import { Container } from '@n8n/di';
import { createEvalAgent } from '@n8n/instance-ai';
import { fileTypeFromBuffer } from 'file-type';
import FormData from 'form-data';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import {
	buildDateAnchors,
	createLlmMockHandler,
	extractDateFilterConstraints,
	findDateFilterViolations,
	formatWriteLedger,
	isPlaceholderHost,
} from '../mock-handler';
import { extractNodeConfig } from '../node-config';

// `restoreMocks: true` in the root vi.config wipes `.mockImplementation` set
// inside vi.mock factories before every test, so re-apply the mocks that
// matter for tests to pass. Keep in sync with the factory bodies above.
function reapplyMockImplementations() {
	vi.mocked(Container.get).mockReturnValue(mockLogger);
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

	it('should write textBody into a binary PDF response', async () => {
		llmSubmits({
			type: 'binary',
			contentType: 'application/pdf',
			filename: 'invoice.pdf',
			textBody: 'Invoice Number: INV-2026-0042',
		});
		const handler = createLlmMockHandler();
		const result = await callHandler(handler);

		const sniffed = await fileTypeFromBuffer(result.body as Buffer);
		expect(sniffed?.mime).toBe('application/pdf');
		expect((result.body as Buffer).toString('latin1')).toContain(
			'(Invoice Number: INV-2026-0042) Tj',
		);
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
		const { extractNodeConfig } = (await import('../node-config.js')) as unknown as {
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

	it('lets timers run before it serves a cached repeat, like a real request', async () => {
		llmSubmits({ type: 'json', body: { records: [] } });
		const handler = createLlmMockHandler();
		await callHandler(handler);

		const order: string[] = [];
		setTimeout(() => order.push('timer'), 0);
		await callHandler(handler).then(() => order.push('cached reply'));

		// A loop of instant repeats would starve the timer that ends the run's budget.
		expect(order).toEqual(['timer', 'cached reply']);
	});

	it('fails every request once the run is aborted, like a cancelled request', async () => {
		llmSubmits({ type: 'json', body: { ok: true } });
		const abort = new AbortController();
		const handler = createLlmMockHandler({ signal: abort.signal });
		await callHandler(handler);

		abort.abort();

		await expect(handler(baseRequest, baseNode)).rejects.toThrow(/cancelled/);
		expect(mockGenerate).toHaveBeenCalledTimes(1);
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
		const { extractNodeConfig } = (await import('../node-config.js')) as unknown as {
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
// Earlier writes ledger — a read sees what this execution already wrote
// ---------------------------------------------------------------------------

describe('earlier writes ledger', () => {
	const SECTION = '## Earlier writes in this execution';
	const sheetsUrl = 'https://sheets.googleapis.com/v4/spreadsheets/eval-spreadsheet-id/values';
	const logNode = { name: 'Log Candidate Row', type: 'n8n-nodes-base.googleSheets' } as INode;
	const lookupNode = {
		name: 'Write Score to Candidate Row',
		type: 'n8n-nodes-base.googleSheets',
	} as INode;
	const appendRow = (sourceFile: string, extra: Record<string, unknown> = {}) =>
		({
			url: `${sheetsUrl}/CVs!A:F:append`,
			method: 'POST',
			qs: { valueInputOption: 'USER_ENTERED' },
			body: { range: 'CVs!A:F', values: [[sourceFile, 'Pending']], ...extra },
		}) as IHttpRequestOptions;
	const readSheet = { url: `${sheetsUrl}/CVs`, method: 'GET' } as IHttpRequestOptions;
	const promptOf = (call: number) => mockGenerate.mock.calls[call][0];
	const sectionOf = (prompt: string) =>
		prompt.slice(prompt.indexOf(SECTION), prompt.lastIndexOf('## Date anchors'));

	it('shows a later read the row an earlier request appended to the same service', async () => {
		llmSubmits({ type: 'json', body: { updates: { updatedRows: 1 } } });
		llmSubmits({ type: 'json', body: { values: [] } });
		const handler = createLlmMockHandler();

		await handler(appendRow('Doe, Jane A_.pdf [#1368-1]'), logNode);
		await handler(readSheet, lookupNode);

		expect(promptOf(0)).not.toContain(SECTION);
		const prompt = promptOf(1);
		expect(prompt).toContain(SECTION);
		expect(prompt).toContain(
			'POST /v4/spreadsheets/eval-spreadsheet-id/values/CVs!A:F:append ("Log Candidate Row")',
		);
		expect(prompt).toContain('"valueInputOption":"USER_ENTERED"');
		expect(prompt).toContain('Doe, Jane A_.pdf [#1368-1]');
		// Date anchors stay the last section.
		expect(prompt.indexOf(SECTION)).toBeLessThan(prompt.lastIndexOf('## Date anchors'));
	});

	it('leaves out reads, failed writes and writes to another service', async () => {
		llmSubmits({ type: 'json', body: { values: [] } });
		llmSubmits({ type: 'error', statusCode: 400, body: { error: { message: 'bad range' } } });
		llmSubmits({ type: 'json', body: { ok: true } });
		llmSubmits({ type: 'json', body: { values: [] } });
		const handler = createLlmMockHandler();

		await handler(
			{ url: `${sheetsUrl}/Archive`, method: 'GET' } as IHttpRequestOptions,
			lookupNode,
		);
		await handler(appendRow('rejected.pdf'), logNode);
		await handler(
			{
				url: 'https://slack.com/api/chat.postMessage',
				method: 'POST',
				body: { text: 'posted' },
			} as IHttpRequestOptions,
			baseNode,
		);
		await handler(readSheet, lookupNode);

		expect(promptOf(3)).not.toContain(SECTION);
	});

	it('leaves out a write the mock could not answer', async () => {
		llmRejects(new Error('provider down'));
		const handler = createLlmMockHandler({ maxRetries: 0 });
		await handler(appendRow('lost.pdf'), logNode);

		generateOverride.fn = undefined;
		llmSubmits({ type: 'json', body: { values: [] } });
		await handler(readSheet, lookupNode);

		expect(promptOf(1)).not.toContain(SECTION);
	});

	it('shows only the latest writes and cuts long bodies', async () => {
		const handler = createLlmMockHandler();
		for (let i = 1; i <= 12; i++) {
			llmSubmits({ type: 'json', body: { updates: { updatedRows: 1 } } });
			await handler(appendRow(`row-${i}-${i === 12 ? 'x'.repeat(5000) : 'end'}`), logNode);
		}
		llmSubmits({ type: 'json', body: { values: [] } });
		await handler(readSheet, lookupNode);

		const section = sectionOf(promptOf(12));
		expect(section).toContain('4 earlier writes to this service not shown');
		expect(section).not.toContain('row-4-end');
		expect(section).toContain('row-5-end');
		expect(section).toContain('row-12-x');
		expect(section).toContain('…');
		expect(section.length).toBeLessThan(4600);
	});

	it('redacts secret keys in a recorded write body', async () => {
		llmSubmits({ type: 'json', body: { ok: true } });
		llmSubmits({ type: 'json', body: { values: [] } });
		const handler = createLlmMockHandler();

		await handler(appendRow('cv.pdf', { access_token: 'tok-1234567890' }), logNode);
		await handler(readSheet, lookupNode);

		const section = sectionOf(promptOf(1));
		expect(section).toContain('<redacted>');
		expect(section).not.toContain('tok-1234567890');
	});

	it.each([
		['OpenAI Responses', 'https://api.openai.com/v1/responses', { input: 'FIRST-PROMPT' }],
		[
			'OpenAI chat completions',
			'https://api.openai.com/v1/chat/completions',
			{ messages: [{ role: 'user', content: 'FIRST-PROMPT' }] },
		],
		[
			'Anthropic messages',
			'https://api.anthropic.com/v1/messages',
			{ messages: [{ role: 'user', content: 'FIRST-PROMPT' }] },
		],
		[
			'OpenAI embeddings',
			'https://api.openai.com/v1/embeddings',
			{ model: 'text-embedding-3-small', input: 'FIRST-PROMPT' },
		],
		[
			'OpenAI moderations',
			'https://api.openai.com/v1/moderations',
			{ model: 'omni-moderation-latest', input: 'FIRST-PROMPT' },
		],
		[
			'OpenAI audio transcriptions',
			'https://api.openai.com/v1/audio/transcriptions',
			{ model: 'whisper-1', prompt: 'FIRST-PROMPT' },
		],
		[
			'OpenAI audio translations',
			'https://api.openai.com/v1/audio/translations',
			{ model: 'whisper-1', prompt: 'FIRST-PROMPT' },
		],
		[
			'OpenAI audio speech',
			'https://api.openai.com/v1/audio/speech',
			{ model: 'tts-1', input: 'FIRST-PROMPT', voice: 'alloy' },
		],
	])('does not show an earlier %s inference call as a write', async (_name, url, firstBody) => {
		llmSubmits({ type: 'json', body: { id: 'gen-1' } });
		llmSubmits({ type: 'json', body: { id: 'gen-2' } });
		const handler = createLlmMockHandler();
		const modelNode = { name: 'Model', type: '@n8n/n8n-nodes-langchain.openAi' } as INode;

		await handler({ url, method: 'POST', body: firstBody } as IHttpRequestOptions, modelNode);
		await handler(
			{ url, method: 'POST', body: { input: 'SECOND-PROMPT' } } as IHttpRequestOptions,
			modelNode,
		);

		expect(promptOf(1)).not.toContain(SECTION);
		expect(promptOf(1)).not.toContain('FIRST-PROMPT');
	});

	it('leaves out a GraphQL mutation answered with errors and no data', async () => {
		llmSubmits({ type: 'json', body: { errors: [{ message: 'Forbidden' }], data: null } });
		llmSubmits({ type: 'json', body: { data: { issues: { nodes: [] } } } });
		const handler = createLlmMockHandler();
		const graphqlUrl = 'https://api.linear.app/graphql';

		await handler(
			{
				url: graphqlUrl,
				method: 'POST',
				body: {
					query: 'mutation CreateIssue { issueCreate(input: { title: "Bug" }) { success } }',
				},
			} as IHttpRequestOptions,
			baseNode,
		);
		await handler(
			{
				url: graphqlUrl,
				method: 'POST',
				body: { query: 'query Issues { issues { nodes { id } } }' },
			} as IHttpRequestOptions,
			baseNode,
		);

		expect(promptOf(1)).not.toContain(SECTION);
	});

	it('leaves out a write answered with ok: false', async () => {
		llmSubmits({ type: 'json', body: { ok: false, error: 'channel_not_found' } });
		llmSubmits({ type: 'json', body: { ok: true, messages: [] } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://slack.com/api/chat.postMessage',
				method: 'POST',
				body: { channel: 'C1', text: 'posted' },
			} as IHttpRequestOptions,
			baseNode,
		);
		await handler(
			{
				url: 'https://slack.com/api/conversations.history?channel=C1',
				method: 'GET',
			} as IHttpRequestOptions,
			baseNode,
		);

		expect(promptOf(1)).not.toContain(SECTION);
	});

	it('regenerates an identical read after a write to the same service', async () => {
		llmSubmits({ type: 'json', body: { values: [] } });
		llmSubmits({ type: 'json', body: { updates: { updatedRows: 1 } } });
		llmSubmits({ type: 'json', body: { values: [['new.pdf', 'Pending']] } });
		const handler = createLlmMockHandler();

		await handler(readSheet, lookupNode);
		await handler(appendRow('new.pdf'), logNode);
		await handler(readSheet, lookupNode);

		expect(mockGenerate).toHaveBeenCalledTimes(3);
		expect(promptOf(2)).toContain('new.pdf');
	});

	it('still serves an identical read from the cache when only another service was written', async () => {
		llmSubmits({ type: 'json', body: { values: [] } });
		llmSubmits({ type: 'json', body: { ok: true } });
		const handler = createLlmMockHandler();

		await handler(readSheet, lookupNode);
		await handler(baseRequest, baseNode);
		await handler(readSheet, lookupNode);

		expect(mockGenerate).toHaveBeenCalledTimes(2);
	});

	it('redacts secret query parameters in a recorded write URL', async () => {
		llmSubmits({ type: 'json', body: { ok: true } });
		llmSubmits({ type: 'json', body: { values: [] } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: `${sheetsUrl}/CVs!A:F:append?access_token=tok-1234567890&valueInputOption=RAW`,
				method: 'POST',
				body: { values: [['cv.pdf']] },
			} as IHttpRequestOptions,
			logNode,
		);
		await handler(readSheet, lookupNode);

		const section = sectionOf(promptOf(1));
		expect(section).not.toContain('tok-1234567890');
		expect(section).toContain('access_token=<redacted>');
		expect(section).toContain('valueInputOption=RAW');
	});

	describe('GraphQL', () => {
		const graphqlUrl = 'https://api.linear.app/graphql';
		const graphql = (query: string) =>
			({ url: graphqlUrl, method: 'POST', body: { query } }) as IHttpRequestOptions;
		const listIssues = graphql('query Issues { issues { nodes { id title } } }');

		it('does not record a GraphQL query as a write', async () => {
			llmSubmits({ type: 'json', body: { data: { issues: { nodes: [] } } } });
			llmSubmits({ type: 'json', body: { data: { viewer: { id: 'u1' } } } });
			const handler = createLlmMockHandler();

			await handler(listIssues, baseNode);
			await handler(graphql('{ viewer { id } }'), baseNode);

			expect(promptOf(1)).not.toContain(SECTION);
		});

		it('records a GraphQL mutation and regenerates an identical query after it', async () => {
			llmSubmits({ type: 'json', body: { data: { issues: { nodes: [] } } } });
			llmSubmits({ type: 'json', body: { data: { issueCreate: { success: true } } } });
			llmSubmits({ type: 'json', body: { data: { issues: { nodes: [{ id: 'i1' }] } } } });
			const handler = createLlmMockHandler();

			await handler(listIssues, baseNode);
			await handler(
				graphql(
					'# create one\nmutation CreateIssue { issueCreate(input: { title: "Bug" }) { success } }',
				),
				baseNode,
			);
			await handler(listIssues, baseNode);

			expect(mockGenerate).toHaveBeenCalledTimes(3);
			const section = sectionOf(promptOf(2));
			expect(section).toContain('POST /graphql');
			expect(section).toContain('mutation CreateIssue');
		});
	});

	describe('formatWriteLedger', () => {
		const entry = {
			hostname: 'sheets.googleapis.com',
			method: 'PUT',
			endpoint: '/v4/x',
			nodeName: 'A',
		};

		it('returns undefined when this service has no writes', () => {
			expect(formatWriteLedger([], 'sheets.googleapis.com')).toBeUndefined();
			expect(formatWriteLedger([entry], 'api.slack.com')).toBeUndefined();
			expect(formatWriteLedger([entry], undefined)).toBeUndefined();
		});

		it('numbers the writes in order', () => {
			expect(formatWriteLedger([entry, { ...entry, nodeName: 'B' }], 'sheets.googleapis.com')).toBe(
				'- [1] PUT /v4/x ("A")\n- [2] PUT /v4/x ("B")',
			);
		});

		it('drops the oldest shown writes when the newest 8 exceed the total budget', () => {
			// Each body is at the 600-character cut, so each line is about 630
			// characters: the newest 8 are about 5,000, and only the newest 6 fit in 4,000.
			const writes = Array.from({ length: 12 }, (_, i) => ({
				...entry,
				nodeName: `W${i + 1}`,
				body: `row-${i + 1}-`.padEnd(600, 'x'),
			}));

			const ledger = formatWriteLedger(writes, 'sheets.googleapis.com') ?? '';
			const lines = ledger.split('\n');

			expect(lines[0]).toBe('(6 earlier writes to this service not shown)');
			expect(lines.slice(1).map((line) => line.slice(0, line.indexOf(' PUT')))).toEqual([
				'- [7]',
				'- [8]',
				'- [9]',
				'- [10]',
				'- [11]',
				'- [12]',
			]);
			expect(ledger).not.toContain('row-6-');
			expect(ledger).toContain('- [12] PUT /v4/x ("W12") body: row-12-');
			expect(lines.slice(1).join('\n').length).toBeLessThanOrEqual(4000);
		});
	});
});

// ---------------------------------------------------------------------------
// Provider-shape normalization — deterministic backstop wired into the handler
// ---------------------------------------------------------------------------

describe('provider-shape normalization', () => {
	const geminiRequest = {
		url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
		method: 'POST',
	} as IHttpRequestOptions;
	const geminiNode = { name: 'Gemini', type: 'n8n-nodes-base.httpRequest' } as INode;

	const imagesRequest = {
		url: 'https://api.openai.com/v1/images/generations',
		method: 'POST',
	} as IHttpRequestOptions;
	const imagesNode = { name: 'OpenAI', type: 'n8n-nodes-base.httpRequest' } as INode;

	it('coerces a shape-wrong Gemini payload into the candidates envelope end-to-end', async () => {
		llmSubmits({ type: 'json', body: { text: 'the answer' } });
		const handler = createLlmMockHandler();

		const result = await callHandler(handler, geminiRequest, geminiNode);

		const body = result.body as {
			candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
		};
		expect(body.candidates[0].content.parts[0].text).toBe('the answer');
	});

	it('guarantees data[].b64_json for a url-only OpenAI images payload end-to-end', async () => {
		llmSubmits({ type: 'json', body: { data: [{ url: 'https://x/y.png' }] } });
		const handler = createLlmMockHandler();

		const result = await callHandler(handler, imagesRequest, imagesNode);

		const body = result.body as { data: Array<Record<string, unknown>> };
		expect(typeof body.data[0].b64_json).toBe('string');
	});

	it('rejects a shape-wrong provider body via submit_response before it returns', async () => {
		llmSubmits({ type: 'json', body: { data: [{ b64_json: 'AAAA' }] } });
		const handler = createLlmMockHandler();
		await handler(imagesRequest, imagesNode);

		const submitHandler = submitCapture.handler;
		if (!submitHandler) throw new Error('submit_response handler was not captured');

		await expect(
			submitHandler({ type: 'json', body: { url: 'https://x/y.png' } }),
		).resolves.toContain('b64_json');
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
// Placeholder API hosts — reserved example names have no real API to recall
// ---------------------------------------------------------------------------

describe('placeholder API hosts', () => {
	it.each([
		'api.example.com',
		'API.Example.COM',
		'api.example.com.',
		'api.ticketdesk.example.com',
		'example.org',
		'example.net',
		'helpdesk.acme-demo.test',
		'billing.invalid',
		'shop.example',
		'app.localhost',
	])('treats %s as a placeholder host', (hostname) => {
		expect(isPlaceholderHost(hostname)).toBe(true);
	});

	it.each([
		'api.slack.com',
		'example.com.evil.io',
		'notexample.com',
		'api.internal',
		'printer.local',
		'test',
		undefined,
	])('treats %s as a real host', (hostname) => {
		expect(isPlaceholderHost(hostname)).toBe(false);
	});

	it('asks a placeholder host for the stated layout, else a bare array', async () => {
		llmSubmits({ type: 'json', body: [] });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.example.com/v1/orders?status=paid', method: 'GET' }, {
			name: 'Fetch Orders',
			type: 'n8n-nodes-base.httpRequest',
		} as INode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('## Placeholder API');
		expect(prompt).toContain('bare top-level JSON array');
		expect(prompt).not.toContain('No API documentation is attached');
	});

	it('keeps the GraphQL envelope for a placeholder GraphQL endpoint', async () => {
		llmSubmits({ type: 'json', body: { data: { orders: [] } } });
		const handler = createLlmMockHandler();

		await handler(
			{
				url: 'https://api.example.com/graphql',
				method: 'POST',
				body: { query: '{ orders { id } }' },
			},
			{ name: 'Fetch Orders', type: 'n8n-nodes-base.graphql' } as INode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('## Placeholder API');
		expect(prompt).toContain('## GraphQL format requirement');
		expect(prompt).toContain('keep the GraphQL envelope');
		// The placeholder error rule must not contradict the GraphQL error format.
		expect(prompt).toContain('a GraphQL request uses the GraphQL error format');
		expect(prompt).not.toContain('For an error scenario, still use type "error".');
	});

	it.each([
		'n8n-nodes-base.httpRequest',
		'n8n-nodes-base.httpRequestTool',
		'n8n-nodes-base.graphql',
	])('applies the Placeholder API section to the generic HTTP client %s', async (type) => {
		llmSubmits({ type: 'json', body: [] });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://api.example.com/v1/orders', method: 'GET' }, {
			name: 'Fetch Orders',
			type,
		} as INode);

		expect(mockGenerate.mock.calls[0][0]).toContain('## Placeholder API');
	});

	it('keeps the API-knowledge note for a service node on a placeholder host', async () => {
		// The eval credential seeder points WordPress at https://blog.example.com.
		llmSubmits({ type: 'json', body: [] });
		const handler = createLlmMockHandler();

		await handler({ url: 'https://blog.example.com/wp-json/wp/v2/posts', method: 'GET' }, {
			name: 'Get Posts',
			type: 'n8n-nodes-base.wordpress',
		} as INode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('No API documentation is attached');
		expect(prompt).not.toContain('## Placeholder API');
	});

	it('keeps the API-knowledge note for a real host', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('No API documentation is attached');
		expect(prompt).not.toContain('## Placeholder API');
	});

	it('passes a layout stated in the scenario to a placeholder host', async () => {
		llmSubmits({ type: 'json', body: [] });
		const scenarioHints =
			'The ticket API GET returns three open tickets: [{ "id": "T-1", "priority": "high" }]';
		const handler = createLlmMockHandler({ scenarioHints });

		await handler(
			{ url: 'https://api.ticketdesk.example.com/v1/tickets?status=open', method: 'GET' },
			{ name: 'Fetch Open Tickets', type: 'n8n-nodes-base.httpRequest' } as INode,
		);

		const prompt = mockGenerate.mock.calls[0][0];
		expect(prompt).toContain('## Placeholder API');
		expect(prompt).toContain(scenarioHints);
	});

	it('lets the Placeholder API section override the layout rule', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);

		const { instructions } = vi.mocked(createEvalAgent).mock.calls.at(-1)![1] as {
			instructions: string;
		};
		expect(instructions).toContain('Placeholder API section');
		const envelopeRule = instructions.slice(instructions.indexOf('**Response envelope.**'));
		expect(envelopeRule.slice(0, envelopeRule.indexOf('\n'))).toContain(
			'Exception: when the user message has a Placeholder API section, that section decides the layout.',
		);
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
		expect(result).not.toMatch(/API docs/i);
	});

	it('points the model at its own API knowledge, never at attached docs', async () => {
		llmSubmits({ type: 'json', body: {} });
		const handler = createLlmMockHandler();

		await handler(baseRequest, baseNode);

		const { instructions } = vi.mocked(createEvalAgent).mock.calls.at(-1)![1] as {
			instructions: string;
		};
		expect(instructions).not.toMatch(/\bdocs\b|documentation/i);
	});
});

// ---------------------------------------------------------------------------
// Endpoint normalizers — binary fidelity (Drive resumable init, Gmail raw attachments)
// ---------------------------------------------------------------------------

describe('normalizeDriveResumableInit', () => {
	const driveNode = { name: 'Drive', type: 'n8n-nodes-base.googleDrive' } as INode;

	it('serves the resumable initiation deterministically with a location header', async () => {
		llmSubmits({ type: 'json', body: { id: 'file123' } });
		const handler = createLlmMockHandler();
		const result = await callHandler(
			handler,
			{
				url: 'https://www.googleapis.com/upload/drive/v3/files',
				method: 'POST',
				qs: { uploadType: 'resumable', supportsAllDrives: true },
			} as IHttpRequestOptions,
			driveNode,
		);

		expect(result.body).toEqual({});
		expect(result.statusCode).toBe(200);
		expect(result.headers.location).toBe(
			'https://www.googleapis.com/upload/drive/v3/files?upload_id=eval-resumable-upload',
		);
	});

	it('leaves the chunk PUT to the minted session URI to the model', async () => {
		llmSubmits({ type: 'json', body: { id: 'file123', name: 'x.png' } });
		const handler = createLlmMockHandler();
		const result = await callHandler(
			handler,
			{
				url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=eval-resumable-upload',
				method: 'PUT',
			} as IHttpRequestOptions,
			driveNode,
		);

		expect(result.body).toEqual({ id: 'file123', name: 'x.png' });
		expect(result.headers.location).toBeUndefined();
	});

	it('does not touch multipart uploads', async () => {
		llmSubmits({ type: 'json', body: { id: 'file123' } });
		const handler = createLlmMockHandler();
		const result = await callHandler(
			handler,
			{
				url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
				method: 'POST',
			} as IHttpRequestOptions,
			driveNode,
		);

		expect(result.body).toEqual({ id: 'file123' });
		expect(result.headers.location).toBeUndefined();
	});
});

describe('substituteBinaryMimeParts (gmail raw attachments)', () => {
	const gmailNode = { name: 'Get Invoice Email', type: 'n8n-nodes-base.gmail' } as INode;
	const gmailRequest = {
		url: 'https://www.googleapis.com/gmail/v1/users/me/messages/m1',
		method: 'GET',
		qs: { format: 'raw' },
	} as IHttpRequestOptions;

	const rawWithPdfPart = [
		'From: billing@acme.test',
		'To: me@example.test',
		'Subject: Invoice INV-88',
		'MIME-Version: 1.0',
		'Content-Type: multipart/mixed; boundary="b1"',
		'',
		'--b1',
		'Content-Type: text/plain; charset="UTF-8"',
		'',
		'Invoice attached.',
		'--b1',
		'Content-Type: application/pdf; name="invoice.pdf"',
		'Content-Disposition: attachment; filename="invoice.pdf"',
		'Content-Transfer-Encoding: base64',
		'',
		'Invoice INV-88 total USD 42.50',
		'--b1--',
	].join('\n');

	it('replaces a plaintext-authored PDF part with real bytes carrying that text', async () => {
		llmSubmits({ type: 'json', body: { id: 'm1', raw: rawWithPdfPart } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler, gmailRequest, gmailNode);

		const raw = (result.body as { raw: string }).raw;
		const decoded = Buffer.from(raw, 'base64url').toString('utf8');
		expect(decoded).toContain('Invoice attached.'); // text part untouched
		const partB64 = decoded
			.split('Content-Transfer-Encoding: base64')[1]
			.split('--b1--')[0]
			.replace(/\s/g, '');
		const pdf = Buffer.from(partB64, 'base64');
		expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
		expect(pdf.toString('latin1')).toContain('(Invoice INV-88 total USD 42.50) Tj');
	});

	it('replaces a garbage base64 PDF stub with a valid document', async () => {
		const rawWithStub = rawWithPdfPart.replace('Invoice INV-88 total USD 42.50', 'JVBERi0xLjQ=');
		llmSubmits({ type: 'json', body: { id: 'm1', raw: rawWithStub } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler, gmailRequest, gmailNode);

		const decoded = Buffer.from((result.body as { raw: string }).raw, 'base64url').toString('utf8');
		const partB64 = decoded
			.split('Content-Transfer-Encoding: base64')[1]
			.split('--b1--')[0]
			.replace(/\s/g, '');
		const pdf = Buffer.from(partB64, 'base64');
		expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
		expect(pdf.toString('latin1')).toContain('%%EOF');
	});

	it('substitutes image attachment parts with the standard fixture bytes', async () => {
		const rawWithImage = rawWithPdfPart
			.replace(
				'Content-Type: application/pdf; name="invoice.pdf"',
				'Content-Type: image/png; name="chart.png"',
			)
			.replace(
				'Content-Disposition: attachment; filename="invoice.pdf"',
				'Content-Disposition: attachment; filename="chart.png"',
			);
		llmSubmits({ type: 'json', body: { id: 'm1', raw: rawWithImage } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler, gmailRequest, gmailNode);

		const decoded = Buffer.from((result.body as { raw: string }).raw, 'base64url').toString('utf8');
		const partB64 = decoded
			.split('Content-Transfer-Encoding: base64')[1]
			.split('--b1--')[0]
			.replace(/\s/g, '');
		const png = Buffer.from(partB64, 'base64');
		expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
	});

	it('adds the base64 transfer-encoding header when the part lacked one', async () => {
		const rawNoEncoding = rawWithPdfPart.replace('Content-Transfer-Encoding: base64\n', '');
		llmSubmits({ type: 'json', body: { id: 'm1', raw: rawNoEncoding } });
		const handler = createLlmMockHandler();
		const result = await callHandler(handler, gmailRequest, gmailNode);

		const decoded = Buffer.from((result.body as { raw: string }).raw, 'base64url').toString('utf8');
		expect(decoded).toContain('Content-Transfer-Encoding: base64');
	});
});

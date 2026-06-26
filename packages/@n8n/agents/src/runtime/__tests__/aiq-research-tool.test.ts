import { afterEach, describe, expect, it, vi } from 'vitest';

import { isZodSchema } from '../../utils/zod';
import { AIQ_RESEARCH_TOOL_NAME, createAiqResearchTool } from '../tools/aiq-research-tool';

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
}

describe('createAiqResearchTool', () => {
	const originalServerUrl = process.env.AIQ_SERVER_URL;

	afterEach(() => {
		if (originalServerUrl === undefined) {
			delete process.env.AIQ_SERVER_URL;
		} else {
			process.env.AIQ_SERVER_URL = originalServerUrl;
		}
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('creates the aiq_research tool', () => {
		const tool = createAiqResearchTool();

		expect(tool.name).toBe(AIQ_RESEARCH_TOOL_NAME);
		expect(tool.description).toContain('NVIDIA AI-Q Blueprint');
		expect(tool.systemInstruction).toContain('aiq-research skill');
		expect(tool.inputSchema).toBeDefined();
	});

	it('checks health against the local default backend', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ status: 'ok' }));
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'health' }, {})).resolves.toEqual({ status: 'ok' });

		expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/health', {
			method: 'GET',
		});
	});

	it('falls back to /v1/health when /health fails', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('missing', { status: 404 }))
			.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'health' }, {})).resolves.toEqual({ status: 'ok' });

		expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/health', {
			method: 'GET',
		});
		expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:8000/v1/health', {
			method: 'GET',
		});
	});

	it('falls back to 127.0.0.1 when the default localhost backend is unreachable', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('fetch failed'))
			.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'health' }, {})).resolves.toEqual({ status: 'ok' });

		expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/health', {
			method: 'GET',
		});
		expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://127.0.0.1:8000/health', {
			method: 'GET',
		});
	});

	it('returns connection details when AI-Q cannot be reached', async () => {
		process.env.AIQ_SERVER_URL = 'https://aiq.example.test';
		const fetchMock = vi.fn(async () => {
			throw new TypeError('fetch failed', { cause: new Error('connection refused') });
		});
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'health' }, {})).rejects.toThrow(
			'AI-Q request could not reach the backend. Tried https://aiq.example.test/',
		);
		await expect(tool.handler?.({ action: 'health' }, {})).rejects.toThrow(
			'fetch failed: connection refused',
		);
	});

	it('posts chat requests with the AI-Q headless header', async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse({ choices: [{ message: { content: 'Direct answer' } }] }),
		);
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'chat', query: 'Research this' }, {})).resolves.toEqual({
			choices: [{ message: { content: 'Direct answer' } }],
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as Parameters<typeof fetch>;
		expect(url).toBe('http://localhost:8000/chat');
		expect(init).toMatchObject({
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-AIQ-Mode': 'headless' },
		});
		expect(JSON.parse(String(init?.body))).toEqual({
			messages: [{ role: 'user', content: 'Research this' }],
		});
	});

	it('extracts deep-research job ids from routed chat responses', async () => {
		const jobId = '123e4567-e89b-12d3-a456-426614174000';
		const fetchMock = vi.fn(async () =>
			jsonResponse({
				choices: [{ message: { content: `Deep research started. Job ID: ${jobId}` } }],
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(
			tool.handler?.({ action: 'chat', query: 'Deep research this' }, {}),
		).resolves.toEqual({
			status: 'deep_research_running',
			jobId,
		});
	});

	it('rejects non-local http AI-Q backends', async () => {
		process.env.AIQ_SERVER_URL = 'http://example.com';
		const fetchMock = vi.fn(async () => jsonResponse({ status: 'ok' }));
		vi.stubGlobal('fetch', fetchMock);
		const tool = createAiqResearchTool();

		await expect(tool.handler?.({ action: 'health' }, {})).rejects.toThrow(
			'Non-local AIQ_SERVER_URL values must use https',
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('requires a UUID jobId for report requests', () => {
		const tool = createAiqResearchTool();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		expect(tool.inputSchema.safeParse({ action: 'report', jobId: 'not-a-uuid' }).success).toBe(
			false,
		);
		expect(
			tool.inputSchema.safeParse({
				action: 'report',
				jobId: '123e4567-e89b-12d3-a456-426614174000',
			}).success,
		).toBe(true);
	});
});

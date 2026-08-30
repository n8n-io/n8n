import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withCodexCompat } from '../codex-compat';

const url = 'https://chatgpt.com/backend-api/codex/responses';

type CapturedInit = { body?: BodyInit | null; headers?: HeadersInit };

/** Reads back the init the wrapper forwarded to the inner fetch. */
function captured(inner: ReturnType<typeof vi.fn>): CapturedInit {
	return inner.mock.calls[0][1] as CapturedInit;
}

function capturedBody(inner: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const body = captured(inner).body;
	if (typeof body !== 'string') throw new Error('forwarded body is not a string');
	const raw = body;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) throw new Error('body is not an object');
		return parsed as Record<string, unknown>;
	} catch {
		throw new Error(`forwarded body is not JSON: ${raw}`);
	}
}

function capturedHeaders(inner: ReturnType<typeof vi.fn>): Headers {
	return new Headers(captured(inner).headers);
}

describe('withCodexCompat transport', () => {
	it('falls back to the SSE fetch when the WebSocket cannot be used', async () => {
		// Port 1 refuses the upgrade, so the wrapper must degrade rather than
		// fail: the SSE path is always the safety net.
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)('http://127.0.0.1:1/responses', {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-5.6-sol' }),
		});

		expect(inner).toHaveBeenCalledTimes(1);
		expect(capturedBody(inner).store).toBe(false);
	});
});

describe('withCodexCompat', () => {
	// These cover the body/header rewriting on the SSE path. Without this the
	// wrapper would try a real WebSocket upgrade against the URL under test.
	beforeEach(() => {
		vi.stubEnv('N8N_CODEX_DISABLE_WEBSOCKET', 'true');
	});
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('forces store:false, which the Codex endpoint rejects when true', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-5.6-sol', store: true, stream: true }),
		});

		expect(capturedBody(inner).store).toBe(false);
	});

	it('adds store:false when the caller omitted it entirely', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-5.6-sol' }),
		});

		expect(capturedBody(inner).store).toBe(false);
	});

	it('leaves stream alone so a non-streaming caller is not handed an SSE body', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-5.6-sol', stream: false }),
		});

		expect(capturedBody(inner).stream).toBe(false);
	});

	it('preserves every other body field', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-5.6-sol', input: [{ role: 'user' }], tools: [] }),
		});

		expect(capturedBody(inner)).toMatchObject({
			model: 'gpt-5.6-sol',
			input: [{ role: 'user' }],
			tools: [],
		});
	});

	it('sets the originator Codex requires, or the backend answers 403', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, { method: 'POST', body: '{}' });

		const headers = capturedHeaders(inner);
		expect(headers.get('originator')).toBe('codex_cli_rs');
		expect(headers.get('user-agent')).toBe('codex_cli_rs');
		// The Codex Responses route is gated behind this beta opt-in.
		expect(headers.get('openai-beta')).toBe('responses=experimental');
	});

	it('keeps caller-supplied auth headers intact', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: '{}',
			headers: { authorization: 'Bearer t', 'chatgpt-account-id': 'acc_1' },
		});

		const headers = capturedHeaders(inner);
		expect(headers.get('authorization')).toBe('Bearer t');
		expect(headers.get('chatgpt-account-id')).toBe('acc_1');
	});

	it('does not override an explicitly supplied originator', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, {
			method: 'POST',
			body: '{}',
			headers: { originator: 'codex_vscode' },
		});

		expect(capturedHeaders(inner).get('originator')).toBe('codex_vscode');
	});

	it('passes a non-JSON body through untouched', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url, { method: 'POST', body: 'not json' });

		expect(captured(inner).body).toBe('not json');
	});

	it('passes a request with no init straight through', async () => {
		const inner = vi.fn().mockResolvedValue(new Response('ok'));

		await withCodexCompat(inner)(url);

		expect(inner).toHaveBeenCalledWith(url);
	});
});

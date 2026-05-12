import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createClient } from '../client';
import { N8nValidationError, N8nError } from '../errors';

type OperationFn = (args?: Record<string, unknown>) => Promise<unknown>;

interface CallableProxy extends OperationFn {
	[member: string]: CallableProxy | OperationFn;
}

function asProxy(value: unknown): CallableProxy {
	if (typeof value !== 'function') {
		throw new Error('Expected a callable proxy');
	}
	return value as CallableProxy;
}

function asFn(value: unknown): OperationFn {
	if (typeof value !== 'function') {
		throw new Error('Expected a callable proxy');
	}
	return value as OperationFn;
}

describe('proxy dispatch', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('n8n.slack.message.send dispatches to POST /executions/node with correct body', async () => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: () =>
				Promise.resolve({
					executionId: 'e1',
					status: 'success',
					output: [{ ok: true }],
					executionUrl: 'http://x/executions/e1',
				}),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const slack = asProxy((n8n as Record<string, unknown>).slack);
		const message = asProxy(slack.message);
		const send = asFn(message.send);

		const result = (await send({
			credentialId: 'c1',
			channel: '#x',
			text: 'hi',
		})) as { executionId: string; output: unknown };

		expect(fetchMock).toHaveBeenCalledWith(
			'http://x/rest/executions/node',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/naming-convention
					Authorization: 'Bearer t',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'Content-Type': 'application/json',
				}),
				body: JSON.stringify({
					nodeType: 'n8n-nodes-base.slack',
					parameters: { resource: 'message', operation: 'send', channel: '#x', text: 'hi' },
					credentialId: 'c1',
				}),
			}),
		);
		expect(result.executionId).toBe('e1');
		// Single-item output array is unwrapped to a plain object for ergonomic access.
		expect(result.output).toEqual({ ok: true });
	});

	it('returns executionUrl from server', async () => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: () =>
				Promise.resolve({
					executionId: 'e1',
					status: 'success',
					output: [],
					executionUrl: 'http://x/executions/e1',
				}),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const slack = asProxy((n8n as Record<string, unknown>).slack);
		const message = asProxy(slack.message);
		const send = asFn(message.send);

		const result = (await send({ credentialId: 'c1', channel: '#x', text: 'hi' })) as {
			executionUrl: string;
		};
		expect(result.executionUrl).toBe('http://x/executions/e1');
	});

	it('throws N8nValidationError on 400', async () => {
		fetchMock.mockResolvedValue({
			status: 400,
			ok: false,
			json: () => Promise.resolve({ error: 'bad params' }),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const slack = asProxy((n8n as Record<string, unknown>).slack);
		const message = asProxy(slack.message);
		const send = asFn(message.send);

		await expect(send({ credentialId: 'c1', channel: '#x', text: '' })).rejects.toThrow(
			N8nValidationError,
		);
	});

	it('throws N8nError on non-2xx, non-400 responses', async () => {
		fetchMock.mockResolvedValue({
			status: 500,
			ok: false,
			text: () => Promise.resolve('boom'),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const set = asProxy((n8n as Record<string, unknown>).set);
		const json = asFn(set.json);

		await expect(json({ values: {} })).rejects.toThrow(N8nError);
	});

	it('handles 2-segment id (n8n.set.json)', async () => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: () =>
				Promise.resolve({
					executionId: 'e1',
					status: 'success',
					output: [],
					executionUrl: 'http://x/executions/e1',
				}),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const set = asProxy((n8n as Record<string, unknown>).set);
		const json = asFn(set.json);

		await json({ values: {} });

		expect(fetchMock).toHaveBeenCalledWith(
			'http://x/rest/executions/node',
			expect.objectContaining({
				body: JSON.stringify({
					nodeType: 'n8n-nodes-base.set',
					parameters: { operation: 'json', values: {} },
					credentialId: undefined,
				}),
			}),
		);
	});

	it('keeps multi-item output arrays as arrays', async () => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: () =>
				Promise.resolve({
					executionId: 'e1',
					status: 'success',
					output: [{ a: 1 }, { b: 2 }],
					executionUrl: 'http://x/executions/e1',
				}),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const set = asProxy((n8n as Record<string, unknown>).set);
		const json = asFn(set.json);

		const result = (await json({ values: {} })) as { output: unknown };
		expect(result.output).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it('does not treat the proxy itself as thenable', async () => {
		// Guard against `then`/`catch`/`finally` being intercepted by the
		// proxy. If they were, accidentally `await`-ing the proxy (or having
		// it flow through Promise.resolve) would silently dispatch a phantom
		// `then` operation.
		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const slack = (n8n as Record<string, unknown>).slack as Record<string, unknown>;
		expect(slack.then).toBeUndefined();
		expect(slack.catch).toBeUndefined();
		expect(slack.finally).toBeUndefined();
		const resource = slack.message as Record<string, unknown>;
		expect(resource.then).toBeUndefined();
		expect(resource.catch).toBeUndefined();
		expect(resource.finally).toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('respects fully-qualified node types containing a dot', async () => {
		fetchMock.mockResolvedValue({
			status: 200,
			ok: true,
			json: () =>
				Promise.resolve({
					executionId: 'e1',
					status: 'success',
					output: [],
					executionUrl: 'http://x/executions/e1',
				}),
		});

		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		const customNs = asFn((n8n as Record<string, unknown>)['@n8n/nodes-langchain.openAi']);
		await customNs({ prompt: 'hi' });

		expect(fetchMock).toHaveBeenCalledWith(
			'http://x/rest/executions/node',
			expect.objectContaining({
				body: JSON.stringify({
					nodeType: '@n8n/nodes-langchain.openAi',
					parameters: { prompt: 'hi' },
					credentialId: undefined,
				}),
			}),
		);
	});
});

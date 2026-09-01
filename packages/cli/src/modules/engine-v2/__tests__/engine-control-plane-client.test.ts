import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import type { LifecycleEvent } from '@n8n/engine';
import { InvalidActionTokenError, verifyActionToken } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneClient } from '../engine-control-plane-client';

const authSecret = 'a'.repeat(32);

const events: LifecycleEvent[] = [
	{
		type: 'execution:completed',
		executionId: 'exec-1',
		workflowId: 'wf-1',
		at: '2026-08-24T10:00:00.000Z',
	},
];

describe('EngineControlPlaneClient', () => {
	let http: HttpRequestClient;
	let clientOptions: HttpRequestClientOptions | undefined;
	let client: EngineControlPlaneClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body: '', headers: {} });
	};

	/** Rebuilds the client so each test can vary the config. */
	const newClient = (engineConfig: Partial<EngineConfig> = {}) => {
		http = mock<HttpRequestClient>();
		const outboundHttp = mock<OutboundHttp>({
			requests: vi.fn((options?: HttpRequestClientOptions) => {
				clientOptions = options;
				return http;
			}),
		});

		return new EngineControlPlaneClient(
			mock<EngineConfig>({
				controlPlaneBaseUrl: '',
				authSecret,
				controlPlanePort: 3001,
				...engineConfig,
			}),
			outboundHttp,
		);
	};

	beforeEach(() => {
		client = newClient();
		signal = new AbortController().signal;
	});

	describe('sendLifecycleEvents', () => {
		it('posts the batch to the control plane status-callback endpoint', async () => {
			respondWith(204);

			await client.sendLifecycleEvents(events, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '/internal/status-callback',
					method: 'POST',
					body: { events },
					json: true,
				}),
			);
		});

		it('does not follow redirects, so the action token reaches only the configured host', async () => {
			respondWith(204);

			await client.sendLifecycleEvents(events, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({ disableFollowRedirect: true }),
			);
		});

		it('dials the control plane server on the loopback, not n8n main', () => {
			expect(clientOptions?.baseURL).toBe('http://127.0.0.1:3001');
		});

		it('dials the configured base URL when the control plane answers elsewhere', () => {
			newClient({ controlPlaneBaseUrl: 'https://cp.internal:8443' });

			expect(clientOptions?.baseURL).toBe('https://cp.internal:8443');
		});

		it('opts out of SSRF protection for the n8n-controlled host', () => {
			expect(clientOptions?.useDefaultSsrfPolicy).toBe('unsafe');
		});

		it('leaves the send deadline to the engine, which owns it', () => {
			// A client timeout would fire first and hide the engine's deadline.
			expect(clientOptions?.timeout).toBeUndefined();
		});

		it("forwards the engine's abort signal, so an abandoned batch cancels its request", async () => {
			respondWith(204);

			await client.sendLifecycleEvents(events, signal);

			expect(http.request).toHaveBeenCalledWith(expect.objectContaining({ abortSignal: signal }));
		});

		it('mints a fresh token per request', () => {
			expect(typeof clientOptions?.headers).toBe('function');
		});

		it('sends an action token scoped to lifecycle-event writes that the control plane accepts', () => {
			const headers = clientOptions?.headers;
			const resolved = typeof headers === 'function' ? headers() : headers;
			const authorization = resolved?.authorization ?? '';

			expect(authorization).toMatch(/^Bearer .+/);

			const token = authorization.replace('Bearer ', '');

			expect(() => verifyActionToken(authSecret, token, 'lifecycle-events:write')).not.toThrow();
			expect(() => verifyActionToken('b'.repeat(32), token, 'lifecycle-events:write')).toThrow(
				InvalidActionTokenError,
			);
		});

		it.each([302, 400, 401, 500])(
			'rejects a batch the control plane answered %s',
			async (statusCode) => {
				respondWith(statusCode);

				await expect(client.sendLifecycleEvents(events, signal)).rejects.toThrow(OperationalError);
				await expect(client.sendLifecycleEvents(events, signal)).rejects.toThrow(
					String(statusCode),
				);
			},
		);

		it('resolves on a 204', async () => {
			respondWith(204);

			await expect(client.sendLifecycleEvents(events, signal)).resolves.toBeUndefined();
		});
	});
});

import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionScope, LifecycleEvent } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneClient } from '../engine-control-plane-client';
import type { EngineControlPlaneTransport } from '../engine-control-plane-transport';

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
	let requestedScope: ActionScope | undefined;
	let client: EngineControlPlaneClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body: '', headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		const transport = mock<EngineControlPlaneTransport>({
			forScope: vi.fn((scope: ActionScope) => {
				requestedScope = scope;
				return http;
			}),
		});
		client = new EngineControlPlaneClient(transport);
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

		it('asks the transport for a client scoped to lifecycle-event writes', () => {
			expect(requestedScope).toBe('lifecycle-events:write');
		});

		it("forwards the engine's abort signal, so an abandoned batch cancels its request", async () => {
			respondWith(204);

			await client.sendLifecycleEvents(events, signal);

			expect(http.request).toHaveBeenCalledWith(expect.objectContaining({ abortSignal: signal }));
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

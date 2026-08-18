import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import type { StartExecutionRequest } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneClient } from '../engine-data-plane-client';

describe('EngineDataPlaneClient', () => {
	const request: StartExecutionRequest = {
		workflowId: 'wf-1',
		graph: { nodes: [], edges: [] },
	};

	let http: HttpRequestClient;
	let clientOptions: HttpRequestClientOptions | undefined;
	let client: EngineDataPlaneClient;

	const respondWith = (statusCode: number, body: unknown) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		const outboundHttp = mock<OutboundHttp>({
			requests: vi.fn((options?: HttpRequestClientOptions) => {
				clientOptions = options;
				return http;
			}),
		});

		client = new EngineDataPlaneClient(
			mock<EngineConfig>({ port: 3000, host: '0.0.0.0' }),
			outboundHttp,
		);
	});

	describe('startExecution', () => {
		it('posts the request to the engine and returns the execution id', async () => {
			respondWith(201, { executionId: 'exec-1' });

			await expect(client.startExecution(request)).resolves.toEqual({ executionId: 'exec-1' });

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '/api/workflow-executions',
					method: 'POST',
					body: request,
				}),
			);
		});

		it('dials the loopback, not the bind host', () => {
			expect(clientOptions?.baseURL).toBe('http://127.0.0.1:3000');
		});

		it('opts out of SSRF protection for the n8n-controlled engine host', () => {
			expect(clientOptions?.ssrf).toBe('disabled');
		});

		it.each([
			[400, { error: 'invalid_graph', reason: 'cycle detected' }, 'cycle detected'],
			[429, { error: 'admittance_rejected', reason: 'at capacity' }, 'at capacity'],
			[501, { error: 'unimplemented', reason: 'wait steps' }, 'wait steps'],
		])('surfaces the engine reason for %i responses', async (statusCode, body, reason) => {
			respondWith(statusCode, body);

			await expect(client.startExecution(request)).rejects.toThrow(reason);
		});

		it('falls back to the error code when there is no reason', async () => {
			respondWith(400, { error: 'invalid_request' });

			await expect(client.startExecution(request)).rejects.toThrow('invalid_request');
		});

		it('reports the status when the engine fails unexpectedly', async () => {
			respondWith(500, { error: 'boom' });

			await expect(client.startExecution(request)).rejects.toThrow('500');
		});

		it('still throws when the body is not the engine error shape', async () => {
			respondWith(502, '<html>bad gateway</html>');

			await expect(client.startExecution(request)).rejects.toThrow('502');
		});
	});
});

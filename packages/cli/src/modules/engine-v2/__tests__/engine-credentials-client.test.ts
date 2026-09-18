import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionScope } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import { EngineCredentialsClient } from '../engine-credentials-client';
import type { ResolveCredentialRequest } from '../engine-credentials.contract';

const request: ResolveCredentialRequest = {
	credential: { id: 'cred-1', name: 'Header Auth account', type: 'httpHeaderAuth' },
	execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
};

const decrypted = { name: 'X-Api-Key', value: 'secret' };

describe('EngineCredentialsClient', () => {
	let http: HttpRequestClient;
	let requestedScope: ActionScope | undefined;
	let client: EngineCredentialsClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number, body: unknown = { data: decrypted }) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		const transport = mock<EngineControlPlaneTransport>({
			forScope: vi.fn((scope: ActionScope) => {
				requestedScope = scope;
				return http;
			}),
		});
		client = new EngineCredentialsClient(transport);
		signal = new AbortController().signal;
	});

	it('asks the transport for a client scoped to credential reads', () => {
		expect(requestedScope).toBe('credentials:read');
	});

	describe('resolve credential', () => {
		it('posts the request as the body of the credentials resolve endpoint', async () => {
			respondWith(200);

			await client.resolve(request, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '/internal/credentials/resolve',
					method: 'POST',
					body: request,
					json: true,
				}),
			);
		});

		it('does not follow redirects, so the action token reaches only the configured host', async () => {
			respondWith(200);

			await client.resolve(request, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({ disableFollowRedirect: true }),
			);
		});

		it("forwards the step's abort signal, so an abandoned step cancels its request", async () => {
			respondWith(200);

			await client.resolve(request, signal);

			expect(http.request).toHaveBeenCalledWith(expect.objectContaining({ abortSignal: signal }));
		});

		it('returns the decrypted data of a 200', async () => {
			respondWith(200);

			await expect(client.resolve(request, signal)).resolves.toEqual(decrypted);
		});

		it.each([302, 400, 401, 403, 404, 500])(
			'rejects with the status when the control plane answered %s',
			async (statusCode) => {
				respondWith(statusCode, { message: 'details the node must not see' });

				const error = await client.resolve(request, signal).catch((e: unknown) => e);

				expect(error).toBeInstanceOf(OperationalError);
				expect((error as Error).message).toContain(String(statusCode));
				expect((error as Error).message).toContain(request.credential.id);
				expect((error as Error).message).not.toContain('details the node must not see');
			},
		);

		it.each([
			['an empty body', ''],
			['a string body', 'ok'],
			['an object without data', { credential: decrypted }],
			['a data field that is not an object', { data: 'secret' }],
			['a data field that is an array', { data: [decrypted] }],
		])('rejects a 200 with %s', async (_label, body) => {
			respondWith(200, body);

			await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
			await expect(client.resolve(request, signal)).rejects.toThrow('malformed');
		});
	});
});

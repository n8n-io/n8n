import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { SharedSecretIdentityVerifier } from '@n8n/engine';
import type { StartExecutionRequest } from '@n8n/engine';
import type { InstanceSettings } from 'n8n-core';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneClient } from '../engine-data-plane-client';

const authSecret = 'a'.repeat(32);

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

	/** Returns the error `startExecution` threw, so tests can assert its class too. */
	const startExecutionError = async (): Promise<unknown> =>
		await client.startExecution(request).then(
			() => expect.unreachable('startExecution should have rejected'),
			(error: unknown) => error,
		);

	/** Rebuilds the client so each test can vary the engine config. */
	const newClient = (config: Partial<EngineConfig> = {}) => {
		http = mock<HttpRequestClient>();
		const outboundHttp = mock<OutboundHttp>({
			requests: vi.fn((options?: HttpRequestClientOptions) => {
				clientOptions = options;
				return http;
			}),
		});

		return new EngineDataPlaneClient(
			mock<EngineConfig>({ port: 3000, host: '0.0.0.0', baseUrl: '', authSecret, ...config }),
			outboundHttp,
			mock<InstanceSettings>({ instanceId: 'instance-1' }),
		);
	};

	beforeEach(() => {
		client = newClient();
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

		it('does not follow redirects, so the identity token reaches only the configured host', async () => {
			respondWith(201, { executionId: 'exec-1' });

			await client.startExecution(request);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({ disableFollowRedirect: true }),
			);
		});

		it('dials the loopback, not the bind host', () => {
			expect(clientOptions?.baseURL).toBe('http://127.0.0.1:3000');
		});

		it('dials the configured base URL when the engine answers elsewhere', () => {
			newClient({ host: '10.0.0.5', baseUrl: 'http://10.0.0.5:3000' });

			expect(clientOptions?.baseURL).toBe('http://10.0.0.5:3000');
		});

		it('keeps the configured base URL even for a remote engine', () => {
			newClient({ baseUrl: 'https://engine.internal:8443' });

			expect(clientOptions?.baseURL).toBe('https://engine.internal:8443');
		});

		it('opts out of SSRF protection for the n8n-controlled engine host', () => {
			expect(clientOptions?.useDefaultSsrfPolicy).toBe('unsafe');
		});

		it('sends an identity token the engine accepts, proving the caller is the instance id', () => {
			const headers = clientOptions?.headers;
			const resolved = typeof headers === 'function' ? headers() : headers;
			const authorization = resolved?.authorization ?? '';

			expect(authorization).toMatch(/^Bearer .+/);

			const token = authorization.replace('Bearer ', '');
			const verifier = new SharedSecretIdentityVerifier(authSecret);

			expect(verifier.verify(token)).toEqual({ cpId: 'instance-1', tenantId: 'instance-1' });
		});

		it.each([
			{
				case: 'a rejected graph',
				statusCode: 400,
				body: { error: 'invalid_graph', reason: 'cycle detected' },
				errorClass: UserError,
				message: 'Engine rejected the workflow: cycle detected',
			},
			{
				case: 'a refused admission',
				statusCode: 429,
				body: { error: 'admittance_rejected', reason: 'at capacity' },
				errorClass: OperationalError,
				message: 'Engine did not admit the execution: at capacity',
			},
			{
				case: 'an unsupported workflow',
				statusCode: 501,
				body: { error: 'unimplemented', reason: 'wait steps' },
				errorClass: UserError,
				message: 'Engine does not support this workflow yet: wait steps',
			},
			{
				case: 'an error code with no reason',
				statusCode: 400,
				body: { error: 'invalid_request' },
				errorClass: UserError,
				message: 'Engine rejected the workflow: invalid_request',
			},
			{
				case: 'an unexpected engine failure',
				statusCode: 500,
				body: { error: 'boom' },
				errorClass: OperationalError,
				message: 'Engine responded with 500: boom',
			},
			{
				case: 'a redirect the client refused to follow',
				statusCode: 302,
				body: '',
				errorClass: OperationalError,
				message: 'Engine responded with 302',
			},
			{
				case: 'a body that is not the engine error shape',
				statusCode: 502,
				body: '<html>bad gateway</html>',
				errorClass: OperationalError,
				message: 'Engine responded with 502',
			},
		])('maps $case to $errorClass.name', async ({ statusCode, body, errorClass, message }) => {
			respondWith(statusCode, body);

			const error = await startExecutionError();

			expect(error).toBeInstanceOf(errorClass);
			expect(error).toHaveProperty('message', message);
		});
	});
});

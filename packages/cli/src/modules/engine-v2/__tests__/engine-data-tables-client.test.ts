import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionScope } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import { EngineDataTablesClient } from '../engine-data-tables-client';
import type { DataTableCallRequest } from '../engine-data-tables.contract';

const request: DataTableCallRequest = {
	execution: { executionId: 'exec-1', workflowId: 'wf-1' },
	consumer: { nodeType: 'n8n-nodes-base.dataTable' },
	call: { kind: 'getColumns', dataTableId: 'dt-1' },
};

const columns = [{ id: 'col-1', name: 'total', type: 'number', index: 0, dataTableId: 'dt-1' }];

describe('EngineDataTablesClient', () => {
	let http: HttpRequestClient;
	let requestedScope: ActionScope | undefined;
	let client: EngineDataTablesClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number, body: unknown = { data: columns }) => {
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
		client = new EngineDataTablesClient(transport);
		signal = new AbortController().signal;
	});

	it('asks the transport for a client scoped to data table use', () => {
		expect(requestedScope).toBe('data-tables:use');
	});

	describe('call', () => {
		it('posts the request as the body of the data table call endpoint', async () => {
			respondWith(200);

			await client.call(request, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '/internal/data-tables/call',
					method: 'POST',
					body: request,
					json: true,
				}),
			);
		});

		it('does not follow redirects, so the action token reaches only the configured host', async () => {
			respondWith(200);

			await client.call(request, signal);

			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({ disableFollowRedirect: true }),
			);
		});

		it('hands the step signal to the request, so a stopped step stops waiting', async () => {
			respondWith(200);

			await client.call(request, signal);

			expect(http.request).toHaveBeenCalledWith(expect.objectContaining({ abortSignal: signal }));
		});

		it('returns the result of a successful call', async () => {
			respondWith(200);

			await expect(client.call(request, signal)).resolves.toEqual({ data: columns });
		});

		it('returns a refusal as an answer, not a failure', async () => {
			const error = { kind: 'node-operation', message: 'gone', description: 'choose another' };
			respondWith(422, { error });

			await expect(client.call(request, signal)).resolves.toEqual({ error });
		});

		it.each([
			[401, { code: 401, message: 'Unauthenticated' }],
			[403, { code: 403, message: 'Data tables are not available to this node type' }],
			[500, { code: 500, message: 'Internal Server Error' }],
			[302, undefined],
		])(
			'throws on a %s without a refusal body, naming the call and the status',
			async (statusCode, body) => {
				respondWith(statusCode, body);

				const error = await client.call(request, signal).catch((e: unknown) => e);

				expect(error).toBeInstanceOf(OperationalError);
				expect((error as Error).message).toBe(
					`Control plane refused data table call "getColumns" with ${statusCode}`,
				);
			},
		);

		it('throws on a 2xx body of neither shape', async () => {
			respondWith(200, { rows: [] });

			const error = await client.call(request, signal).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect((error as Error).message).toBe(
				'Control plane returned a malformed response for data table call "getColumns"',
			);
		});

		it('keeps the response body out of the error, because it could hold row data', async () => {
			respondWith(500, { message: 'secret row value' });

			const error = await client.call(request, signal).catch((e: unknown) => e);

			expect((error as Error).message).not.toContain('secret row value');
		});
	});
});

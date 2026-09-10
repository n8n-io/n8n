import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { ApiError, N8nClient } from '../client';

function jsonResponse(status: number, body: unknown): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: '',
		headers: new Headers([['content-type', 'application/json']]),
		json: vi.fn().mockResolvedValue(body),
		text: vi.fn().mockResolvedValue(JSON.stringify(body)),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
	} as unknown as Response;
}

/** The method and URL of each request the client made, in order. */
function requestLines(mock: Mock): string[] {
	return (mock.mock.calls as Array<[string, RequestInit]>).map(
		([url, init]) => `${init.method} ${url}`,
	);
}

function binaryResponse(status: number, bytes: Uint8Array): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: '',
		headers: new Headers([['content-type', 'application/gzip']]),
		json: vi.fn().mockRejectedValue(new Error('not json')),
		text: vi.fn().mockResolvedValue(''),
		arrayBuffer: vi
			.fn()
			.mockResolvedValue(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
	} as unknown as Response;
}

describe('N8nClient packages', () => {
	const fetchMock = vi.fn();
	let client: N8nClient;

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		fetchMock.mockReset();
		client = new N8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'test-key' });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('promotions', () => {
		it('promotes and applies on the connection, not on one of its directions', async () => {
			const promoted = {
				connectionId: 'conn-1',
				configId: 'cfg-1',
				counts: { workflows: 2, folders: 0, credentials: 0, dataTables: 0, variables: 0, tags: 0 },
				git: { commitSha: 'abc123', branchName: 'main' },
			};
			fetchMock.mockResolvedValue(jsonResponse(200, promoted));

			await expect(
				client.promotePackage('conn-1', { commitMessage: 'promote projects', force: true }),
			).resolves.toEqual(promoted);

			fetchMock.mockResolvedValue(jsonResponse(200, { connectionId: 'conn-1' }));
			await client.applyPackage('conn-1');

			expect(requestLines(fetchMock)).toEqual([
				'POST https://n8n.example.com/api/v1/promotions/connections/conn-1/promote',
				'POST https://n8n.example.com/api/v1/promotions/connections/conn-1/apply',
			]);

			const [, promoteInit] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(promoteInit.body as string)).toEqual({
				commitMessage: 'promote projects',
				force: true,
			});
		});

		it('clones and disconnects one direction of a connection', async () => {
			const checkout = {
				connectionId: 'conn-1',
				configId: 'cfg-1',
				direction: 'promote',
				branchName: 'main',
				hasCheckout: true,
			};
			fetchMock.mockResolvedValue(jsonResponse(200, checkout));

			await expect(client.clonePromotionCheckout('conn-1', 'promote')).resolves.toEqual(checkout);

			fetchMock.mockResolvedValue(jsonResponse(200, { ...checkout, hasCheckout: false }));
			await client.disconnectPromotionCheckout('conn-1', 'apply');

			expect(requestLines(fetchMock)).toEqual([
				'POST https://n8n.example.com/api/v1/promotions/connections/conn-1/promote/clone',
				'POST https://n8n.example.com/api/v1/promotions/connections/conn-1/apply/disconnect',
			]);
		});

		it('writes and removes the settings of one direction', async () => {
			const promoteConfig = {
				settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
			};
			fetchMock.mockResolvedValue(jsonResponse(200, { id: 'cfg-1', ...promoteConfig }));
			await client.setPromotionConfig('conn-1', 'promote', promoteConfig);

			fetchMock.mockResolvedValue(jsonResponse(200, { id: 'cfg-2' }));
			await client.setPromotionConfig('conn-1', 'apply', {
				settings: { schemaVersion: 1, branchName: 'main' },
			});

			fetchMock.mockResolvedValue(jsonResponse(204, undefined));
			await client.deletePromotionConfig('conn-1', 'apply');

			expect(requestLines(fetchMock)).toEqual([
				'PUT https://n8n.example.com/api/v1/promotions/connections/conn-1/configs/promote',
				'PUT https://n8n.example.com/api/v1/promotions/connections/conn-1/configs/apply',
				'DELETE https://n8n.example.com/api/v1/promotions/connections/conn-1/configs/apply',
			]);

			// A write replaces the whole config, so every setting has to reach the API.
			const [, promoteInit] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(promoteInit.body as string)).toEqual(promoteConfig);
		});

		it('follows the cursor to read every page of a list', async () => {
			fetchMock
				.mockResolvedValueOnce(
					jsonResponse(200, { data: [{ id: 'prov-1' }], nextCursor: 'page-2' }),
				)
				.mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 'prov-2' }] }));

			await expect(client.listPromotionProviders()).resolves.toEqual([
				{ id: 'prov-1' },
				{ id: 'prov-2' },
			]);

			expect(requestLines(fetchMock)).toEqual([
				'GET https://n8n.example.com/api/v1/promotions/providers',
				'GET https://n8n.example.com/api/v1/promotions/providers?cursor=page-2',
			]);
		});

		it('stops at the requested number of results and asks only for what is missing', async () => {
			fetchMock
				.mockResolvedValueOnce(
					jsonResponse(200, { data: [{ id: 'p1' }, { id: 'p2' }], nextCursor: 'page-2' }),
				)
				.mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 'p3' }, { id: 'p4' }] }));

			// A server may answer with more rows than asked for, so the extra is dropped.
			await expect(client.listPromotionProviders(3)).resolves.toEqual([
				{ id: 'p1' },
				{ id: 'p2' },
				{ id: 'p3' },
			]);

			expect(requestLines(fetchMock)).toEqual([
				'GET https://n8n.example.com/api/v1/promotions/providers?limit=3',
				'GET https://n8n.example.com/api/v1/promotions/providers?cursor=page-2&limit=1',
			]);
		});

		it('narrows the connection list by scope and provider', async () => {
			fetchMock.mockResolvedValue(jsonResponse(200, { data: [], nextCursor: null }));

			await client.listPromotionConnections({ scope: 'instance', providerId: 'prov-1' });

			expect(requestLines(fetchMock)).toEqual([
				'GET https://n8n.example.com/api/v1/promotions/connections?scope=instance&providerId=prov-1',
			]);
		});
	});

	describe('exportPackage', () => {
		it('posts the workflow IDs as JSON and returns the archive bytes', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1, 2, 3])));

			const result = await client.exportPackage({ workflowIds: ['a', 'b'] });

			expect(Buffer.isBuffer(result.archive)).toBe(true);
			expect(result.archive.equals(Buffer.from([1, 2, 3]))).toBe(true);
			// Older servers omit the counts header.
			expect(result.counts).toBeUndefined();

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n8n.example.com/api/v1/n8n-packages/export');
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a', 'b'] }));
		});

		it('posts the project IDs as JSON and returns the archive bytes', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([4, 5, 6])));

			const result = await client.exportPackage({ projectIds: ['proj-1', 'proj-2'] });

			expect(Buffer.isBuffer(result.archive)).toBe(true);
			expect(result.archive.equals(Buffer.from([4, 5, 6]))).toBe(true);

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n8n.example.com/api/v1/n8n-packages/export');
			expect(init.body).toBe(JSON.stringify({ projectIds: ['proj-1', 'proj-2'] }));
		});

		it('parses the X-N8n-Export-Counts header into counts when the server sends it', async () => {
			const counts = { workflows: 2, folders: 1, credentials: 0, dataTables: 0, variables: 0 };
			const response = binaryResponse(200, new Uint8Array([1, 2, 3]));
			response.headers.set('X-N8n-Export-Counts', JSON.stringify(counts));
			fetchMock.mockResolvedValue(response);

			const result = await client.exportPackage({ workflowIds: ['a'] });

			expect(result.counts).toEqual(counts);
			expect(result.archive.equals(Buffer.from([1, 2, 3]))).toBe(true);
		});

		it('includes folderIds in the body when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'], folderIds: ['f1'] });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a'], folderIds: ['f1'] }));
		});

		it('includes the missing workflow dependency policy when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({
				projectIds: ['proj-1'],
				missingWorkflowDependencyPolicy: 'include-in-package',
			});

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(
				JSON.stringify({
					projectIds: ['proj-1'],
					missingWorkflowDependencyPolicy: 'include-in-package',
				}),
			);
		});

		it('includes the credential export policy when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({
				workflowIds: ['a'],
				credentialExportPolicy: 'no-values',
			});

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(
				JSON.stringify({
					workflowIds: ['a'],
					credentialExportPolicy: 'no-values',
				}),
			);
		});

		it('omits an empty collection from the body', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: [], folderIds: ['f1'] });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ folderIds: ['f1'] }));
		});

		it('includes includeVariableValues=false in the body when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'], includeVariableValues: false });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a'], includeVariableValues: false }));
		});

		it('includes includeVariableValues=true in the body when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'], includeVariableValues: true });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a'], includeVariableValues: true }));
		});

		it('omits includeVariableValues from the body when not provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'] });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a'] }));
		});

		it('includes includeTags=false in the body when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'], includeTags: false });

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a'], includeTags: false }));
		});

		it('includes the workflow version policy when provided', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({
				workflowIds: ['a'],
				workflowVersionPolicy: 'published-strict',
			});

			const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(init.body).toBe(
				JSON.stringify({ workflowIds: ['a'], workflowVersionPolicy: 'published-strict' }),
			);
		});

		it('sends includeArchivedWorkflows only when true', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1])));

			await client.exportPackage({ workflowIds: ['a'], includeArchivedWorkflows: false });
			await client.exportPackage({ workflowIds: ['a'], includeArchivedWorkflows: true });

			const [, first] = fetchMock.mock.calls[0] as [string, RequestInit];
			const [, second] = fetchMock.mock.calls[1] as [string, RequestInit];
			expect(first.body).toBe(JSON.stringify({ workflowIds: ['a'] }));
			expect(second.body).toBe(
				JSON.stringify({ workflowIds: ['a'], includeArchivedWorkflows: true }),
			);
		});
	});

	describe('importPackage', () => {
		it('sends a multipart body with the file and non-empty fields', async () => {
			fetchMock.mockResolvedValue(jsonResponse(200, { workflows: [], bindings: {} }));

			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{
					workflowConflictPolicy: 'fail',
					projectId: 'proj-1',
					folderId: '',
					workflowIdPolicy: 'new',
					credentialMatchingMode: undefined,
					missingNodeTypeMode: undefined,
				},
			);

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n8n.example.com/api/v1/n8n-packages/import');
			expect(init.body).toBeInstanceOf(FormData);

			const form = init.body as FormData;
			expect(form.get('workflowConflictPolicy')).toBe('fail');
			expect(form.get('projectId')).toBe('proj-1');
			expect(form.get('workflowIdPolicy')).toBe('new');
			// Empty/undefined fields are omitted entirely (an omitted CLI flag
			// means the instance default decides).
			expect(form.has('folderId')).toBe(false);
			expect(form.has('credentialMatchingMode')).toBe(false);
			expect(form.has('missingNodeTypeMode')).toBe(false);

			const pkg = form.get('package');
			expect(pkg).toBeInstanceOf(Blob);
			expect((pkg as File).name).toBe('export.n8np');

			// Multipart requests must not carry the default JSON content type;
			// fetch fills in multipart/form-data with its own boundary.
			expect((init.headers as Headers).get('content-type')).toBeNull();
		});

		it('sends credentialMissingMode when provided', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(200, {
					workflows: [],
					bindings: {},
					credentials: { matched: [], stubbed: [] },
				}),
			);

			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{
					workflowConflictPolicy: 'fail',
					credentialMissingMode: 'create-stub',
				},
			);

			const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
			expect(form.get('credentialMissingMode')).toBe('create-stub');
		});

		it('sends missingNodeTypeMode when provided', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(200, {
					workflows: [],
					bindings: {},
					credentials: { matched: [], stubbed: [] },
				}),
			);

			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{
					workflowConflictPolicy: 'fail',
					missingNodeTypeMode: 'import-anyway',
				},
			);

			const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
			expect(form.get('missingNodeTypeMode')).toBe('import-anyway');
		});

		it('sends the data table modes when provided', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(200, {
					workflows: [],
					bindings: {},
					credentials: { matched: [], stubbed: [] },
				}),
			);

			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{
					workflowConflictPolicy: 'fail',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'do-nothing',
					dataTableSchemaConflictPolicy: 'fail',
				},
			);

			const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
			expect(form.get('dataTableMatchingMode')).toBe('by-id');
			expect(form.get('dataTableMissingMode')).toBe('do-nothing');
			expect(form.get('dataTableSchemaConflictPolicy')).toBe('fail');
		});

		describe('variableMissingMode', () => {
			it.each(['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'])(
				'sends %s when provided',
				async (policy) => {
					fetchMock.mockResolvedValue(
						jsonResponse(200, {
							workflows: [],
							bindings: {},
							credentials: { matched: [], stubbed: [] },
							variables: { matched: [], missing: [], created: [], stubbed: [] },
						}),
					);

					await client.importPackage(
						{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
						{
							workflowConflictPolicy: 'fail',
							variableMissingMode: policy,
						},
					);

					const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
					expect(form.get('variableMissingMode')).toBe(policy);
				},
			);
		});

		describe('variableConflictPolicy', () => {
			it.each(['keep-existing', 'overwrite', 'fail'])('sends %s when provided', async (policy) => {
				fetchMock.mockResolvedValue(
					jsonResponse(200, {
						workflows: [],
						bindings: {},
						credentials: { matched: [], stubbed: [] },
						variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
					}),
				);

				await client.importPackage(
					{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
					{
						workflowConflictPolicy: 'fail',
						variableConflictPolicy: policy,
					},
				);

				const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
				expect(form.get('variableConflictPolicy')).toBe(policy);
			});
		});

		describe('variableParentPolicy', () => {
			it.each(['project', 'global'])('sends %s when provided', async (policy) => {
				fetchMock.mockResolvedValue(
					jsonResponse(200, {
						workflows: [],
						bindings: {},
						credentials: { matched: [], stubbed: [] },
						variables: { matched: [], missing: [], created: [], stubbed: [] },
					}),
				);

				await client.importPackage(
					{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
					{
						workflowConflictPolicy: 'fail',
						variableParentPolicy: policy,
					},
				);

				const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
				expect(form.get('variableParentPolicy')).toBe(policy);
			});
		});

		it('forwards bindings verbatim as a form field', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(200, {
					workflows: [],
					bindings: {},
					credentials: { matched: [], stubbed: [] },
				}),
			);

			const bindings = '{"credentials":{"source-cred":"target-cred"}}';
			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{ workflowConflictPolicy: 'fail', bindings },
			);

			const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
			expect(form.get('bindings')).toBe(bindings);
		});

		it('omits credentialMissingMode so the instance default applies', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(200, {
					workflows: [],
					bindings: {},
					credentials: { matched: [], stubbed: [] },
				}),
			);

			await client.importPackage(
				{ buffer: Buffer.from('package-bytes'), filename: 'export.n8np' },
				{ workflowConflictPolicy: 'fail' },
			);

			const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
			expect(form.has('credentialMissingMode')).toBe(false);
		});

		it('throws an ApiError that preserves the blocking-issue details', async () => {
			const body = {
				message: 'Import blocked',
				issues: [
					{
						type: 'workflow-conflict',
						name: 'Flow',
						sourceWorkflowId: 's1',
						existingWorkflowId: 'e1',
					},
				],
			};
			fetchMock.mockResolvedValue(jsonResponse(409, body));

			const error = await client
				.importPackage(
					{ buffer: Buffer.from('p'), filename: 'x.n8np' },
					{ workflowConflictPolicy: 'fail' },
				)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).statusCode).toBe(409);
			expect((error as ApiError).message).toBe('Import blocked');
			expect((error as ApiError).details).toEqual(body);
		});
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

	describe('exportPackage', () => {
		it('posts the workflow IDs as JSON and returns the archive bytes', async () => {
			fetchMock.mockResolvedValue(binaryResponse(200, new Uint8Array([1, 2, 3])));

			const result = await client.exportPackage(['a', 'b']);

			expect(Buffer.isBuffer(result)).toBe(true);
			expect(result.equals(Buffer.from([1, 2, 3]))).toBe(true);

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n8n.example.com/api/v1/n8n-packages/export');
			expect(init.body).toBe(JSON.stringify({ workflowIds: ['a', 'b'] }));
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
				},
			);

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n8n.example.com/api/v1/n8n-packages/import');
			expect(init.body).toBeInstanceOf(FormData);

			const form = init.body as FormData;
			expect(form.get('workflowConflictPolicy')).toBe('fail');
			expect(form.get('projectId')).toBe('proj-1');
			expect(form.get('workflowIdPolicy')).toBe('new');
			// Empty/undefined fields are omitted entirely.
			expect(form.has('folderId')).toBe(false);
			expect(form.has('credentialMatchingMode')).toBe(false);

			const pkg = form.get('package');
			expect(pkg).toBeInstanceOf(Blob);
			expect((pkg as File).name).toBe('export.n8np');

			// Multipart requests must not carry the default JSON content type;
			// fetch fills in multipart/form-data with its own boundary.
			expect((init.headers as Headers).get('content-type')).toBeNull();
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

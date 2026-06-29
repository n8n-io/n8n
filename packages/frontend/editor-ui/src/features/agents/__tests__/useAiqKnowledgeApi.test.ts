import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AiqKnowledgeApiError,
	createAiqCollection,
	deleteAiqDocuments,
	getAiqHealth,
	listAiqCollections,
	normalizeAiqBaseUrl,
	uploadAiqDocuments,
} from '../composables/useAiqKnowledgeApi';

describe('useAiqKnowledgeApi', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});

	it('normalizes AI-Q base URLs', () => {
		expect(normalizeAiqBaseUrl(' https://aiq.example.test/// ')).toBe('https://aiq.example.test');
	});

	it('calls health and collection endpoints with the expected paths and methods', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('{}'))
			.mockResolvedValueOnce(new Response(JSON.stringify({ collections: [{ name: 'docs' }] })))
			.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'docs' })));

		await getAiqHealth('https://aiq.example.test/');
		const collections = await listAiqCollections('https://aiq.example.test/');
		await createAiqCollection('https://aiq.example.test/', { name: 'docs' });

		expect(collections).toEqual([{ name: 'docs' }]);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			'https://aiq.example.test/v1/knowledge/health',
			undefined,
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			'https://aiq.example.test/v1/collections',
			undefined,
		);
		expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://aiq.example.test/v1/collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'docs' }),
		});
	});

	it('uploads documents as multipart files field', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ job_id: 'job-1', file_ids: ['file-1'] })),
		);

		await uploadAiqDocuments('https://aiq.example.test', 'docs', [
			new File(['hello'], 'hello.txt'),
		]);

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('POST');
		expect(init.body).toBeInstanceOf(FormData);
		expect((init.body as FormData).getAll('files')).toHaveLength(1);
	});

	it('sends document deletes with a JSON file_ids body', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

		await deleteAiqDocuments('https://aiq.example.test', 'docs', ['file-1']);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://aiq.example.test/v1/collections/docs/documents',
			{
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ file_ids: ['file-1'] }),
			},
		);
	});

	it('maps HTTP failures into typed errors with status', async () => {
		fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404 }));

		await expect(listAiqCollections('https://aiq.example.test')).rejects.toMatchObject({
			name: 'AiqKnowledgeApiError',
			status: 404,
			message: 'missing',
		} satisfies Partial<AiqKnowledgeApiError>);
	});
});

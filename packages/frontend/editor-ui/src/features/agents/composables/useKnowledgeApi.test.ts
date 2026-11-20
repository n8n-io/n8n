import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	deleteAgentFile,
	deleteCollectionFile,
	getCollection,
	listAgentFiles,
	listCollectionAgents,
	listCollectionFiles,
	uploadAgentFiles,
	uploadCollectionFiles,
	warmAgentKnowledgeSandbox,
} from './useKnowledgeApi';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };
const collection = { projectId: 'p1', collectionId: 'c1' };

describe('useKnowledgeApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the knowledge files of an agent', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce([]);

		await expect(listAgentFiles(restApiContext, 'p1', 'a1')).resolves.toEqual([]);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/p1/agents/v2/a1/files',
		);
	});

	it('uploads the files as the "files" parts of one multipart request', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce([]);
		const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];

		await uploadAgentFiles(restApiContext, 'p1', 'a1', files);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'POST',
			'/projects/p1/agents/v2/a1/files',
			expect.any(FormData),
		);
		const formData = vi.mocked(makeRestApiRequest).mock.calls[0][3] as FormData;
		expect(formData.getAll('files')).toEqual(files);
	});

	it('deletes one knowledge file', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(undefined);

		await deleteAgentFile(restApiContext, 'p1', 'a1', 'file-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'DELETE',
			'/projects/p1/agents/v2/a1/files/file-1',
		);
	});

	it('requests a knowledge sandbox warm-up', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ accepted: true });

		await expect(warmAgentKnowledgeSandbox(restApiContext, 'p1', 'a1')).resolves.toEqual({
			accepted: true,
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'POST',
			'/projects/p1/agents/v2/a1/sandbox/knowledge/warmup',
		);
	});

	it('gets one collection', async () => {
		const summary = { id: 'c1', name: 'Customer support', description: null };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(summary);

		await expect(getCollection(restApiContext, collection)).resolves.toEqual(summary);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/p1/knowledge/collections/c1',
		);
	});

	it('lists the files of a collection', async () => {
		const list = { count: 0, totalSizeBytes: 0, data: [] };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(list);

		await expect(listCollectionFiles(restApiContext, collection)).resolves.toEqual(list);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/p1/knowledge/collections/c1/files',
		);
	});

	it('uploads the files of a collection as the "files" parts of one multipart request', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce([]);
		const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];

		await uploadCollectionFiles(restApiContext, { ...collection, files });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'POST',
			'/projects/p1/knowledge/collections/c1/files',
			expect.any(FormData),
		);
		const formData = vi.mocked(makeRestApiRequest).mock.calls[0][3] as FormData;
		expect(formData.getAll('files')).toEqual(files);
	});

	it('deletes one file of a collection', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ success: true });

		await deleteCollectionFile(restApiContext, { ...collection, fileId: 'f1' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'DELETE',
			'/projects/p1/knowledge/collections/c1/files/f1',
		);
	});

	it('lists the agents that use a collection', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce([]);

		await expect(listCollectionAgents(restApiContext, collection)).resolves.toEqual([]);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/p1/knowledge/collections/c1/agents',
		);
	});
});

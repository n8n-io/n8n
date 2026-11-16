import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	deleteAgentFile,
	listAgentFiles,
	uploadAgentFiles,
	warmAgentKnowledgeSandbox,
} from './useKnowledgeApi';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import { deleteDraftDataset, deleteResult } from '../agentEvals.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('agentEvals.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('deleteResult', () => {
		it('sends a DELETE to the result under the agent’s evals path and returns the response', async () => {
			const response = { success: true as const };
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

			const result = await deleteResult(restApiContext, 'project-1', 'agent-1', 'result-1');

			expect(makeRestApiRequest).toHaveBeenCalledTimes(1);
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'DELETE',
				'/projects/project-1/agents/v2/agent-1/evals/results/result-1',
			);
			expect(result).toBe(response);
		});

		it('propagates a request failure to the caller', async () => {
			vi.mocked(makeRestApiRequest).mockRejectedValueOnce(new Error('forbidden'));

			await expect(
				deleteResult(restApiContext, 'project-1', 'agent-1', 'result-1'),
			).rejects.toThrow('forbidden');
		});
	});

	describe('deleteDraftDataset', () => {
		it('sends a DELETE to the dataset’s draft endpoint, not the plain dataset one', async () => {
			const response = { success: true as const };
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

			const result = await deleteDraftDataset(restApiContext, 'project-1', 'agent-1', 'dataset-1');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'DELETE',
				'/projects/project-1/agents/v2/agent-1/evals/datasets/dataset-1/draft',
			);
			expect(result).toBe(response);
		});
	});
});

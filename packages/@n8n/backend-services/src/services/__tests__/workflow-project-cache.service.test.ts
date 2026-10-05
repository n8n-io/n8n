import type { SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '../cache/cache.service';
import { WorkflowProjectCacheService } from '../workflow-project-cache.service';

describe('WorkflowProjectCacheService', () => {
	const cacheService = mock<CacheService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const service = new WorkflowProjectCacheService(cacheService, sharedWorkflowRepository);

	beforeEach(() => vi.clearAllMocks());

	it('invalidates each workflow owned by the project', async () => {
		sharedWorkflowRepository.find.mockResolvedValueOnce([
			{ workflowId: 'workflow-1' },
			{ workflowId: 'workflow-2' },
		] as never);

		await service.invalidateForProject('project-1');

		expect(sharedWorkflowRepository.find).toHaveBeenCalledWith({
			where: { projectId: 'project-1', role: 'workflow:owner' },
			select: ['workflowId'],
		});
		expect(cacheService.deleteFromHash).toHaveBeenCalledWith('workflow-project', 'workflow-1');
		expect(cacheService.deleteFromHash).toHaveBeenCalledWith('workflow-project', 'workflow-2');
	});
});

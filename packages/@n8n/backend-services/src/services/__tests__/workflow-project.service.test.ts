import type { Project, SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '../cache/cache.service';
import { WorkflowProjectService } from '../workflow-project.service';

describe('WorkflowProjectService', () => {
	const cacheService = mock<CacheService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const service = new WorkflowProjectService(cacheService, sharedWorkflowRepository);

	beforeEach(() => vi.clearAllMocks());

	it('returns the cached project', async () => {
		cacheService.getHashValue.mockResolvedValue({ id: 'project-1' });

		const project = await service.getWorkflowProjectCached('workflow-1');

		expect(project.id).toBe('project-1');
		expect(sharedWorkflowRepository.findOneOrFail).not.toHaveBeenCalled();
	});

	it('loads and caches the owner project after a cache miss', async () => {
		const project = { id: 'project-1', name: 'Project' } as Project;
		cacheService.getHashValue.mockResolvedValue(undefined);
		sharedWorkflowRepository.findOneOrFail.mockResolvedValue({ project } as never);

		await expect(service.getWorkflowProjectCached('workflow-1')).resolves.toBe(project);
		expect(sharedWorkflowRepository.findOneOrFail).toHaveBeenCalledWith({
			where: { workflowId: 'workflow-1', role: 'workflow:owner' },
			relations: ['project'],
		});
		expect(cacheService.setHash).toHaveBeenCalledWith('workflow-project', {
			'workflow-1': project,
		});
	});
});

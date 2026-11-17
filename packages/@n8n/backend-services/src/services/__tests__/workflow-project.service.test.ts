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
		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
	});

	it('loads and caches the owner project after a cache miss', async () => {
		const project = { id: 'project-1', name: 'Project' } as Project;
		cacheService.getHashValue.mockResolvedValue(undefined);
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(project);

		await expect(service.getWorkflowProjectCached('workflow-1')).resolves.toBe(project);
		expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith('workflow-1');
		expect(cacheService.setHash).toHaveBeenCalledWith('workflow-project', {
			'workflow-1': project,
		});
	});

	it.each(['invalid', {}])(
		'loads the owner project when the cached value is malformed',
		async (cached) => {
			const project = { id: 'project-1' } as Project;
			cacheService.getHashValue.mockResolvedValue(cached as never);
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(project);

			await expect(service.getWorkflowProjectCached('workflow-1')).resolves.toBe(project);
			expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledOnce();
		},
	);

	it('sets the cached owner project', async () => {
		const project = { id: 'project-1' } as Project;

		await expect(service.setWorkflowProjectCacheEntry('workflow-1', project)).resolves.toBe(
			project,
		);
		expect(cacheService.setHash).toHaveBeenCalledWith('workflow-project', {
			'workflow-1': project,
		});
	});

	it('invalidates cached workflows owned by a project', async () => {
		sharedWorkflowRepository.find.mockResolvedValue([
			{ workflowId: 'workflow-1' },
			{ workflowId: 'workflow-2' },
		] as never);

		await service.invalidateWorkflowProjectCacheForProject('project-1');

		expect(cacheService.deleteFromHash).toHaveBeenCalledTimes(2);
		expect(cacheService.deleteFromHash).toHaveBeenCalledWith('workflow-project', 'workflow-1');
		expect(cacheService.deleteFromHash).toHaveBeenCalledWith('workflow-project', 'workflow-2');
	});
});

it('resolves private execution owners without adding a shared workflow cache entry', async () => {
	const cache = mock<CacheService>();
	const shares = mock<SharedWorkflowRepository>();
	const service = new WorkflowProjectService(cache, shares);
	shares.getWorkflowOwningProject.mockResolvedValue(undefined);
	const project = mock<Project>({ id: 'private-project' });
	service.registerPrivateOwner('test', async (workflowId) =>
		workflowId === 'private' ? project : undefined,
	);
	await expect(service.getWorkflowProjectCached('private')).resolves.toBe(project);
	expect(cache.setHash).not.toHaveBeenCalled();
	await expect(service.getWorkflowProjectCached('missing')).rejects.toThrow(
		'Workflow project not found',
	);
});

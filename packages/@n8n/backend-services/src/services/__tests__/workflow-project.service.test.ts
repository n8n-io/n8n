import type { Project, SharedWorkflow, SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '../cache/cache.service';
import { WorkflowProjectService } from '../workflow-project.service';

// The real check needs TypeORM's error class, which this package does not depend on.
vi.mock('@n8n/db', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/db')>()),
	isEntityNotFoundError: (error: unknown) =>
		error instanceof Error && error.name === 'EntityNotFoundError',
}));

const entityNotFound = () => Object.assign(new Error('Not found'), { name: 'EntityNotFoundError' });

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
		sharedWorkflowRepository.findOneOrFail.mockResolvedValue({ project } as SharedWorkflow);

		await expect(service.getWorkflowProjectCached('workflow-1')).resolves.toBe(project);
		expect(sharedWorkflowRepository.findOneOrFail).toHaveBeenCalledWith({
			where: { workflowId: 'workflow-1', role: 'workflow:owner' },
			relations: ['project'],
		});
		expect(cacheService.setHash).toHaveBeenCalledWith('workflow-project', {
			'workflow-1': project,
		});
	});

	it.each(['invalid', {}])(
		'loads the owner project when the cached value is malformed',
		async (cached) => {
			const project = { id: 'project-1' } as Project;
			cacheService.getHashValue.mockResolvedValue(cached as never);
			sharedWorkflowRepository.findOneOrFail.mockResolvedValue({ project } as SharedWorkflow);

			await expect(service.getWorkflowProjectCached('workflow-1')).resolves.toBe(project);
			expect(sharedWorkflowRepository.findOneOrFail).toHaveBeenCalledOnce();
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
	const notFound = entityNotFound();
	shares.findOneOrFail.mockRejectedValue(notFound);
	const project = mock<Project>({ id: 'private-project' });
	service.registerPrivateOwner('test', async (workflowId) =>
		workflowId === 'private' ? project : undefined,
	);
	await expect(service.getWorkflowProjectCached('private')).resolves.toBe(project);
	expect(cache.setHash).not.toHaveBeenCalled();
	// Callers detect a workflow without an owner by the repository's not-found error.
	await expect(service.getWorkflowProjectCached('missing')).rejects.toBe(notFound);
});

it('does not ask private owners when the owner lookup fails for another reason', async () => {
	const cache = mock<CacheService>();
	const shares = mock<SharedWorkflowRepository>();
	const service = new WorkflowProjectService(cache, shares);
	const failure = new Error('Database unavailable');
	shares.findOneOrFail.mockRejectedValue(failure);
	const resolve = vi.fn();
	service.registerPrivateOwner('test', resolve);

	await expect(service.getWorkflowProjectCached('workflow-1')).rejects.toBe(failure);
	expect(resolve).not.toHaveBeenCalled();
});

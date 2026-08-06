import { In } from '@n8n/typeorm';

import { WorkflowPublishedVersion } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowPublishedVersionRepository } from '../workflow-published-version.repository';

describe('WorkflowPublishedVersionRepository', () => {
	const entityManager = mockEntityManager(WorkflowPublishedVersion);
	const repository = new WorkflowPublishedVersionRepository(entityManager.connection);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('agent workflow tool publication reads', () => {
		it('returns project-scoped mapping fingerprints as domain rows', async () => {
			const findSpy = vi.spyOn(repository, 'find').mockResolvedValue([
				Object.assign(new WorkflowPublishedVersion(), {
					workflowId: 'workflow-1',
					publishedVersionId: 'version-1',
				}),
			]);

			const result = await repository.findPublishedVersionFingerprintsForAgentTools('project-1', [
				'workflow-1',
				'workflow-2',
			]);

			expect(findSpy).toHaveBeenCalledWith({
				select: { workflowId: true, publishedVersionId: true },
				where: {
					workflowId: In(['workflow-1', 'workflow-2']),
					workflow: {
						isArchived: false,
						shared: { projectId: 'project-1' },
					},
				},
			});
			expect(result).toEqual([{ workflowId: 'workflow-1', versionId: 'version-1' }]);
		});

		it('short-circuits an empty fingerprint query', async () => {
			const findSpy = vi.spyOn(repository, 'find');

			await expect(
				repository.findPublishedVersionFingerprintsForAgentTools('project-1', []),
			).resolves.toEqual([]);
			expect(findSpy).not.toHaveBeenCalled();
		});
	});
});

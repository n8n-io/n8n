import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection } from '../../entities';
import type { KnowledgeCollectionRepository } from '../../repositories/knowledge-collection.repository';
import { KnowledgeCollectionService } from '../knowledge-collection.service';

const collection = mock<KnowledgeCollection>({ id: 'collection-1', projectId: 'project-1' });

function makeService({ collectionsFlag = true }: { collectionsFlag?: boolean } = {}) {
	const collectionRepository = mock<KnowledgeCollectionRepository>();
	// The repository returns a collection only for its home project.
	collectionRepository.findByIdAndProjectId.mockImplementation(
		async ({ collectionId, projectId }) =>
			collectionId === collection.id && projectId === collection.projectId ? collection : null,
	);

	return {
		service: new KnowledgeCollectionService(
			collectionRepository,
			makeKnowledgeAvailabilityService({ collectionsFlag }),
		),
		collectionRepository,
	};
}

describe('KnowledgeCollectionService', () => {
	describe('getInProject', () => {
		it('returns the collection of its home project', async () => {
			const { service } = makeService();

			await expect(
				service.getInProject({ projectId: 'project-1', collectionId: 'collection-1' }),
			).resolves.toBe(collection);
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(
				service.getInProject({ projectId: 'project-1', collectionId: 'collection-1' }),
			).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('answers not found for a missing collection', async () => {
			const { service } = makeService();

			await expect(
				service.getInProject({ projectId: 'project-1', collectionId: 'missing' }),
			).rejects.toThrow(NotFoundError);
		});

		it('answers not found for a collection of another project', async () => {
			const { service } = makeService();

			await expect(
				service.getInProject({ projectId: 'project-2', collectionId: 'collection-1' }),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('listAgentIds', () => {
		it('returns the agents of a collection of the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			await expect(
				service.listAgentIds({ projectId: 'project-1', collectionId: 'collection-1' }),
			).resolves.toEqual(['agent-1', 'agent-2']);
			expect(collectionRepository.findAgentIds).toHaveBeenCalledWith('collection-1', {});
		});

		it('reads no agents of a collection of another project', async () => {
			const { service, collectionRepository } = makeService();

			await expect(
				service.listAgentIds({ projectId: 'project-2', collectionId: 'collection-1' }),
			).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findAgentIds).not.toHaveBeenCalled();
		});
	});
});

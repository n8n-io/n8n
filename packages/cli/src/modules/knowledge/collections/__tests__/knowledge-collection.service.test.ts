import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection } from '../../entities';
import type { KnowledgeCollectionRepository } from '../../repositories/knowledge-collection.repository';
import { KnowledgeCollectionService } from '../knowledge-collection.service';

const ref = { projectId: 'project-1', collectionId: 'collection-1' };
const collection = mock<KnowledgeCollection>({ id: 'collection-1', projectId: 'project-1' });

function makeService({ collectionsFlag = true }: { collectionsFlag?: boolean } = {}) {
	const collectionRepository = mock<KnowledgeCollectionRepository>();
	collectionRepository.findByIdAndProjectId.mockResolvedValue(collection);

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
		it('returns the collection that the repository finds in the project', async () => {
			const { service, collectionRepository } = makeService();

			await expect(service.getInProject(ref)).resolves.toBe(collection);
			expect(collectionRepository.findByIdAndProjectId).toHaveBeenCalledWith(ref, {});
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.getInProject(ref)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		// The repository finds a collection only in its home project.
		it('answers not found when the repository finds no collection in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.getInProject(ref)).rejects.toThrow(NotFoundError);
		});
	});

	describe('listAgentIds', () => {
		it('returns the agents of a collection of the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			await expect(service.listAgentIds(ref)).resolves.toEqual(['agent-1', 'agent-2']);
			expect(collectionRepository.findAgentIds).toHaveBeenCalledWith('collection-1', {});
		});

		it('reads no agents when the collection is not in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.listAgentIds(ref)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findAgentIds).not.toHaveBeenCalled();
		});
	});
});

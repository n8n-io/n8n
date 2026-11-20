import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection } from '../../entities';
import type { KnowledgeCollectionRepository } from '../../repositories/knowledge-collection.repository';
import { KnowledgeCollectionService } from '../knowledge-collection.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const user = mock<User>({ id: 'user-1' });
const collection = mock<KnowledgeCollection>({ id: 'collection-1', projectId: 'project-1' });

function makeService({ collectionsFlag = true }: { collectionsFlag?: boolean } = {}) {
	const collectionRepository = mock<KnowledgeCollectionRepository>();
	collectionRepository.findById.mockResolvedValue(collection);

	return {
		service: new KnowledgeCollectionService(
			collectionRepository,
			makeKnowledgeAvailabilityService({ collectionsFlag }),
		),
		collectionRepository,
	};
}

/** The user has exactly these scopes in the home project of the collection. */
function grantScopes(...granted: Scope[]) {
	vi.mocked(userHasScopes).mockImplementation(
		async (_user, scopes, _globalOnly, { projectId }) =>
			projectId === 'project-1' && scopes.every((scope) => granted.includes(scope)),
	);
}

describe('KnowledgeCollectionService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
		grantScopes('agent:read', 'agent:update');
	});

	describe('getForUser', () => {
		it('returns the collection to a user who can read agents in its home project', async () => {
			grantScopes('agent:read');
			const { service } = makeService();

			await expect(service.getForUser(user, 'collection-1', 'agent:read')).resolves.toBe(
				collection,
			);
		});

		it('returns the collection for a change to a user who can update agents', async () => {
			const { service } = makeService();

			await expect(service.getForUser(user, 'collection-1', 'agent:update')).resolves.toBe(
				collection,
			);
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.getForUser(user, 'collection-1', 'agent:read')).rejects.toThrow(
				NotFoundError,
			);
			expect(collectionRepository.findById).not.toHaveBeenCalled();
		});

		it('answers not found for a missing collection', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findById.mockResolvedValue(null);

			await expect(service.getForUser(user, 'missing', 'agent:read')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('answers not found for a collection without a home project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findById.mockResolvedValue(
				mock<KnowledgeCollection>({ projectId: null }),
			);

			await expect(service.getForUser(user, 'collection-1', 'agent:read')).rejects.toThrow(
				NotFoundError,
			);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('answers not found to a user who cannot read agents in the home project', async () => {
			grantScopes();
			const { service } = makeService();

			await expect(service.getForUser(user, 'collection-1', 'agent:update')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('answers forbidden for a change to a user who can only read agents', async () => {
			grantScopes('agent:read');
			const { service } = makeService();

			await expect(service.getForUser(user, 'collection-1', 'agent:update')).rejects.toThrow(
				ForbiddenError,
			);
		});
	});

	describe('listAgentIds', () => {
		it('returns the agents of a collection the user can see', async () => {
			grantScopes('agent:read');
			const { service, collectionRepository } = makeService();
			collectionRepository.findAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			await expect(service.listAgentIds(user, 'collection-1')).resolves.toEqual([
				'agent-1',
				'agent-2',
			]);
			expect(collectionRepository.findAgentIds).toHaveBeenCalledWith('collection-1', {});
		});

		it('reads no agents of a collection the user cannot see', async () => {
			grantScopes();
			const { service, collectionRepository } = makeService();

			await expect(service.listAgentIds(user, 'collection-1')).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findAgentIds).not.toHaveBeenCalled();
		});
	});
});

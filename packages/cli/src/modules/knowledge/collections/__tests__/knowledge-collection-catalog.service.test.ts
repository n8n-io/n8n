import type { ProjectScopeService } from '@n8n/backend-services';
import type { ProjectRepository, User } from '@n8n/db';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection } from '../../entities';
import type {
	KnowledgeCollectionRepository,
	KnowledgeCollectionSummary,
} from '../../repositories/knowledge-collection.repository';
import { KnowledgeCollectionCatalogService } from '../knowledge-collection-catalog.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';
const input = {
	name: 'Returns playbook',
	description: 'How we handle returns and refunds',
};

const createdAt = new Date('2026-11-20T10:00:00.000Z');
const updatedAt = new Date('2026-11-20T11:00:00.000Z');
const summary: KnowledgeCollectionSummary = {
	collection: mock<KnowledgeCollection>({
		id: 'collection-1',
		name: input.name,
		description: input.description,
		slug: 'returns_playbook',
		createdAt,
		updatedAt,
	}),
	homeProject: { id: 'project-1', name: 'Docs', type: 'team' },
	fileCount: 2,
	totalFileSizeBytes: 300,
	agentCount: 1,
};

const ref = { projectId, collectionId: 'collection-1' };
const collection = mock<KnowledgeCollection>({ id: 'collection-1', projectId });

function makeService({ collectionsFlag = true }: { collectionsFlag?: boolean } = {}) {
	const collectionRepository = mock<KnowledgeCollectionRepository>();
	collectionRepository.existsByProjectIdAndName.mockResolvedValue(false);
	collectionRepository.existsBySlug.mockResolvedValue(false);
	collectionRepository.insertShared.mockResolvedValue(
		mock<KnowledgeCollection>({ id: 'collection-1' }),
	);
	collectionRepository.findSharedSummaryById.mockResolvedValue(summary);
	collectionRepository.findByIdAndProjectId.mockResolvedValue(collection);
	collectionRepository.findSharedSummaries.mockResolvedValue([summary]);

	const projectRepository = mock<ProjectRepository>();
	projectRepository.existsBy.mockResolvedValue(true);

	const projectScopeService = mock<ProjectScopeService>();
	projectScopeService.getProjectIds.mockResolvedValue(['project-1', 'personal-1']);

	return {
		service: new KnowledgeCollectionCatalogService(
			collectionRepository,
			makeKnowledgeAvailabilityService({ collectionsFlag }),
			projectRepository,
			projectScopeService,
		),
		collectionRepository,
		projectRepository,
		projectScopeService,
	};
}

function uniqueConstraintError() {
	return new QueryFailedError(
		'INSERT',
		[],
		Object.assign(new Error('UNIQUE constraint failed'), { code: 'SQLITE_CONSTRAINT_UNIQUE' }),
	);
}

/** The user has exactly these scopes in project-1. */
function grantScopes(...granted: Scope[]) {
	vi.mocked(userHasScopes).mockImplementation(
		async (_user, scopes, _globalOnly, options) =>
			options?.projectId === projectId && scopes.every((scope) => granted.includes(scope)),
	);
}

describe('KnowledgeCollectionCatalogService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
		grantScopes('agent:read', 'agent:update');
	});

	describe('create', () => {
		it('creates a shared collection with a slug from its name and returns it', async () => {
			const { service, collectionRepository } = makeService();

			const result = await service.create(user, projectId, input);

			expect(collectionRepository.insertShared).toHaveBeenCalledWith(
				{
					name: input.name,
					description: input.description,
					slug: 'returns_playbook',
					projectId: 'project-1',
					createdById: 'user-1',
				},
				{},
			);
			expect(result).toEqual({
				id: 'collection-1',
				name: input.name,
				description: input.description,
				slug: 'returns_playbook',
				homeProject: { id: 'project-1', name: 'Docs', type: 'team' },
				fileCount: 2,
				totalFileSizeBytes: 300,
				agentCount: 1,
				createdAt: '2026-11-20T10:00:00.000Z',
				updatedAt: '2026-11-20T11:00:00.000Z',
			});
		});

		it('adds a suffix to the slug when another collection has it', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.existsBySlug.mockImplementation(
				async (slug) => slug === 'returns_playbook',
			);

			await service.create(user, projectId, input);

			const [{ slug }] = collectionRepository.insertShared.mock.calls[0];
			expect(slug).toMatch(/^returns_playbook_[a-z0-9]{6}$/);
		});

		it('answers not found and writes nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.create(user, projectId, input)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.insertShared).not.toHaveBeenCalled();
		});

		it('answers forbidden to a user who cannot update agents in the project', async () => {
			grantScopes('agent:read');
			const { service, collectionRepository } = makeService();

			await expect(service.create(user, projectId, input)).rejects.toThrow(ForbiddenError);
			expect(collectionRepository.insertShared).not.toHaveBeenCalled();
		});

		it('answers not found for a project that does not exist', async () => {
			const { service, collectionRepository, projectRepository } = makeService();
			projectRepository.existsBy.mockResolvedValue(false);

			await expect(service.create(user, projectId, input)).rejects.toThrow(NotFoundError);
			expect(projectRepository.existsBy).toHaveBeenCalledWith({ id: 'project-1' });
			expect(collectionRepository.insertShared).not.toHaveBeenCalled();
		});

		it('answers conflict when the project has a collection with the name', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.existsByProjectIdAndName.mockResolvedValue(true);

			await expect(service.create(user, projectId, input)).rejects.toThrow(ConflictError);
			expect(collectionRepository.insertShared).not.toHaveBeenCalled();
		});

		it('answers conflict when another create takes the name first', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.existsByProjectIdAndName
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true);
			collectionRepository.insertShared.mockRejectedValue(uniqueConstraintError());

			await expect(service.create(user, projectId, input)).rejects.toThrow(ConflictError);
		});

		it('tries a new slug when another create takes the slug first', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.existsBySlug
				.mockResolvedValueOnce(false)
				.mockImplementation(async (slug) => slug === 'returns_playbook');
			collectionRepository.insertShared.mockRejectedValueOnce(uniqueConstraintError());

			const result = await service.create(user, projectId, input);

			expect(collectionRepository.insertShared).toHaveBeenCalledTimes(2);
			const [[first], [second]] = collectionRepository.insertShared.mock.calls;
			expect(first.slug).toBe('returns_playbook');
			expect(second.slug).toMatch(/^returns_playbook_[a-z0-9]{6}$/);
			expect(result.id).toBe('collection-1');
		});

		it('stops after a second slug conflict', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.insertShared.mockRejectedValue(uniqueConstraintError());

			await expect(service.create(user, projectId, input)).rejects.toThrow(QueryFailedError);
			expect(collectionRepository.insertShared).toHaveBeenCalledTimes(2);
		});
	});

	describe('get', () => {
		it('returns the collection of the project with its totals', async () => {
			const { service, collectionRepository } = makeService();

			await expect(service.get(user, ref)).resolves.toMatchObject({
				id: 'collection-1',
				homeProject: { id: 'project-1', name: 'Docs', type: 'team' },
				fileCount: 2,
				totalFileSizeBytes: 300,
				agentCount: 1,
			});
			expect(collectionRepository.findSharedSummaryById).toHaveBeenCalledWith('collection-1', {});
		});

		it('answers not found and reads no totals when the collection is not in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.get(user, ref)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findSharedSummaryById).not.toHaveBeenCalled();
		});
	});

	describe('getInProject', () => {
		it('returns the collection that the repository finds in the project', async () => {
			const { service, collectionRepository } = makeService();

			await expect(service.getInProject(user, ref, 'agent:read')).resolves.toBe(collection);
			expect(collectionRepository.findByIdAndProjectId).toHaveBeenCalledWith(
				ref.collectionId,
				ref.projectId,
				{},
			);
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.getInProject(user, ref, 'agent:read')).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('refuses a user without the scope and reads nothing', async () => {
			const { service, collectionRepository } = makeService();
			grantScopes('agent:read');

			await expect(service.getInProject(user, ref, 'agent:update')).rejects.toThrow(ForbiddenError);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:update'], false, { projectId });
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		// The repository finds a collection only in its home project.
		it('answers not found when the repository finds no collection in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.getInProject(user, ref, 'agent:read')).rejects.toThrow(NotFoundError);
		});
	});

	describe('listAgentIds', () => {
		it('returns the agents of a collection of the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			await expect(service.listAgentIds(user, ref)).resolves.toEqual(['agent-1', 'agent-2']);
			expect(collectionRepository.findAgentIds).toHaveBeenCalledWith('collection-1', {});
		});

		it('reads no agents when the collection is not in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.listAgentIds(user, ref)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findAgentIds).not.toHaveBeenCalled();
		});
	});

	describe('listForUser', () => {
		const member = mock<User>({ id: 'member-1' });
		const instanceOwner = mock<User>({ id: 'owner-1' });

		it('lists the collections of the projects where the member can list agents', async () => {
			const { service, collectionRepository, projectScopeService } = makeService();

			const result = await service.listForUser(member);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(member, ['agent:list']);

			expect(collectionRepository.findSharedSummaries).toHaveBeenCalledWith(
				['project-1', 'personal-1'],
				{},
			);

			expect(result).toEqual({
				count: 1,
				data: [
					{
						id: 'collection-1',
						name: input.name,
						description: input.description,
						slug: 'returns_playbook',
						homeProject: { id: 'project-1', name: 'Docs', type: 'team' },
						fileCount: 2,
						totalFileSizeBytes: 300,
						agentCount: 1,
						createdAt: '2026-11-20T10:00:00.000Z',
						updatedAt: '2026-11-20T11:00:00.000Z',
					},
				],
			});
		});

		it('lists the collections of every project for a global agent:list scope', async () => {
			const { service, collectionRepository, projectScopeService } = makeService();
			// `getProjectIds` answers `null` for a global scope.
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.listForUser(instanceOwner);

			expect(collectionRepository.findSharedSummaries).toHaveBeenCalledWith('all', {});
		});

		it('answers an empty list when no collection matches', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findSharedSummaries.mockResolvedValue([]);

			await expect(service.listForUser(member)).resolves.toEqual({ count: 0, data: [] });
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.listForUser(member)).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findSharedSummaries).not.toHaveBeenCalled();
		});
	});
});

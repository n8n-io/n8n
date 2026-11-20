import type { RoleService } from '@n8n/backend-services';
import {
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	type ProjectRelationRepository,
	type ProjectRepository,
	type User,
} from '@n8n/db';
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

function makeService({ collectionsFlag = true }: { collectionsFlag?: boolean } = {}) {
	const collectionRepository = mock<KnowledgeCollectionRepository>();
	collectionRepository.existsByProjectIdAndName.mockResolvedValue(false);
	collectionRepository.existsBySlug.mockResolvedValue(false);
	collectionRepository.insertShared.mockResolvedValue(
		mock<KnowledgeCollection>({ id: 'collection-1' }),
	);
	collectionRepository.findSharedSummaryById.mockResolvedValue(summary);
	collectionRepository.findSharedSummaries.mockResolvedValue([summary]);

	const projectRepository = mock<ProjectRepository>();
	projectRepository.existsBy.mockResolvedValue(true);

	const projectRelationRepository = mock<ProjectRelationRepository>();
	projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([
		'project-1',
		'personal-1',
	]);

	const roleService = mock<RoleService>();
	roleService.rolesWithScope.mockResolvedValue(['project:personalOwner', 'project:viewer']);

	return {
		service: new KnowledgeCollectionCatalogService(
			collectionRepository,
			makeKnowledgeAvailabilityService({ collectionsFlag }),
			projectRepository,
			projectRelationRepository,
			roleService,
		),
		collectionRepository,
		projectRepository,
		projectRelationRepository,
		roleService,
	};
}

// Assign the role onto an empty mock: mock(overrides) wraps the shared role constant in proxies.
function userWithRole(id: string, role: User['role']) {
	return Object.assign(mock<User>(), { id, role });
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

	describe('listForUser', () => {
		const member = userWithRole('member-1', GLOBAL_MEMBER_ROLE);
		const instanceOwner = userWithRole('owner-1', GLOBAL_OWNER_ROLE);

		it('lists the collections of the projects where the member can read agents', async () => {
			const { service, collectionRepository, projectRelationRepository, roleService } =
				makeService();

			const result = await service.listForUser(member);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['agent:read']);

			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'member-1',
				['project:personalOwner', 'project:viewer'],
			);

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

		it('lists the collections of every project for a global agent:read scope', async () => {
			const { service, collectionRepository, projectRelationRepository } = makeService();

			await service.listForUser(instanceOwner);

			expect(collectionRepository.findSharedSummaries).toHaveBeenCalledWith('all', {});
			expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
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

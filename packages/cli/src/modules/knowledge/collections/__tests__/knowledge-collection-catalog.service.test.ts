import type { UpdateKnowledgeCollectionDto } from '@n8n/api-types';
import type { ProjectScopeService } from '@n8n/backend-services';
import type { ProjectRepository, User } from '@n8n/db';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection } from '../../entities';
import type { KnowledgeWriteRunner } from '../../files/knowledge-file.service';
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
	collectionRepository.isNameTakenInProject.mockResolvedValue(false);
	collectionRepository.findFileTotals.mockResolvedValue(new Map());

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

		it('trims the name and the description before it checks and saves them', async () => {
			const { service, collectionRepository } = makeService();

			await service.create(user, projectId, {
				name: '  Returns playbook ',
				description: ' How we handle returns and refunds  ',
			});

			expect(collectionRepository.existsByProjectIdAndName).toHaveBeenCalledWith(
				'project-1',
				'Returns playbook',
				{},
			);
			expect(collectionRepository.insertShared).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Returns playbook',
					description: 'How we handle returns and refunds',
					slug: 'returns_playbook',
				}),
				{},
			);
		});

		it('answers conflict for a name with spaces when another create takes the name first', async () => {
			const { service, collectionRepository } = makeService();
			// The first check finds nothing. The check after the failed insert finds the trimmed name.
			let checks = 0;
			collectionRepository.existsByProjectIdAndName.mockImplementation(async (_projectId, name) => {
				checks += 1;
				return checks > 1 && name === 'Returns playbook';
			});
			collectionRepository.insertShared.mockRejectedValue(uniqueConstraintError());

			await expect(
				service.create(user, projectId, { ...input, name: '  Returns playbook ' }),
			).rejects.toThrow(ConflictError);
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

	describe('update', () => {
		const changes = { name: 'Refunds playbook', description: 'How we refund' };

		it('can change the name and the description, and returns the collection', async () => {
			const { service, collectionRepository } = makeService();

			await service.update(user, projectId, 'collection-1', changes);

			expect(collectionRepository.findByIdAndProjectId).toHaveBeenCalledWith(
				'collection-1',
				'project-1',
				{},
			);
			expect(collectionRepository.updateNameAndDescription).toHaveBeenCalledWith(
				'collection-1',
				changes,
				{},
			);
		});

		it('returns the updated collection', async () => {
			const { service, collectionRepository } = makeService();
			const updatedSummary: KnowledgeCollectionSummary = {
				...summary,
				collection: mock<KnowledgeCollection>({ ...summary.collection, ...changes }),
			};
			collectionRepository.findSharedSummaryById.mockResolvedValue(updatedSummary);

			const result = await service.update(user, projectId, 'collection-1', changes);

			expect(collectionRepository.updateNameAndDescription).toHaveBeenCalledWith(
				'collection-1',
				changes,
				{},
			);
			expect(collectionRepository.findSharedSummaryById).toHaveBeenCalledWith('collection-1', {});
			expect(result).toMatchObject({
				id: 'collection-1',
				name: 'Refunds playbook',
				description: 'How we refund',
				slug: 'returns_playbook',
			});
		});

		it('changes only the fields in the body', async () => {
			const { service, collectionRepository } = makeService();

			await service.update(user, projectId, 'collection-1', { description: 'How we refund' });

			expect(collectionRepository.isNameTakenInProject).not.toHaveBeenCalled();
			expect(collectionRepository.updateNameAndDescription).toHaveBeenCalledWith(
				'collection-1',
				{ description: 'How we refund' },
				{},
			);
		});

		it('writes only the name and the description, also when a caller passes other fields', async () => {
			const { service, collectionRepository } = makeService();
			// A caller that skips the DTO can pass any field, such as the slug or the project.
			const body = {
				name: 'Refunds playbook',
				slug: 'new_slug',
				projectId: 'other-project',
			} as UpdateKnowledgeCollectionDto;

			await service.update(user, projectId, 'collection-1', body);

			expect(collectionRepository.updateNameAndDescription).toHaveBeenCalledWith(
				'collection-1',
				{ name: 'Refunds playbook' },
				{},
			);
		});

		it('trims the name and the description before it checks and saves them', async () => {
			const { service, collectionRepository } = makeService();

			await service.update(user, projectId, 'collection-1', {
				name: '  Refunds playbook ',
				description: ' How we refund  ',
			});

			expect(collectionRepository.isNameTakenInProject).toHaveBeenCalledWith(
				'project-1',
				'Refunds playbook',
				'collection-1',
				{},
			);
			expect(collectionRepository.updateNameAndDescription).toHaveBeenCalledWith(
				'collection-1',
				{ name: 'Refunds playbook', description: 'How we refund' },
				{},
			);
		});

		it('ignores a name of only spaces', async () => {
			const { service, collectionRepository } = makeService();

			await service.update(user, projectId, 'collection-1', { name: '   ' });

			expect(collectionRepository.isNameTakenInProject).not.toHaveBeenCalled();
			expect(collectionRepository.updateNameAndDescription).not.toHaveBeenCalled();
		});

		it('writes nothing for an empty body and returns the collection', async () => {
			const { service, collectionRepository } = makeService();

			const result = await service.update(user, projectId, 'collection-1', {});

			expect(collectionRepository.updateNameAndDescription).not.toHaveBeenCalled();
			expect(result.id).toBe('collection-1');
		});

		it('checks the name against the other collections of the project only', async () => {
			const { service, collectionRepository } = makeService();

			await service.update(user, projectId, 'collection-1', changes);

			expect(collectionRepository.isNameTakenInProject).toHaveBeenCalledWith(
				'project-1',
				'Refunds playbook',
				'collection-1',
				{},
			);
		});

		it('returns a conflict errorwhen another collection of the project has the name', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.isNameTakenInProject.mockResolvedValue(true);

			await expect(service.update(user, projectId, 'collection-1', changes)).rejects.toThrow(
				ConflictError,
			);
			expect(collectionRepository.updateNameAndDescription).not.toHaveBeenCalled();
		});

		it('returns a conflict error when another rename takes the name first', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.updateNameAndDescription.mockRejectedValue(uniqueConstraintError());

			await expect(service.update(user, projectId, 'collection-1', changes)).rejects.toThrow(
				ConflictError,
			);
		});

		it('returns not found for a collection that is not in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.update(user, projectId, 'collection-1', changes)).rejects.toThrow(
				NotFoundError,
			);
			expect(collectionRepository.updateNameAndDescription).not.toHaveBeenCalled();
		});

		it('returns forbidden for a user who cannot update agents in the project', async () => {
			grantScopes('agent:read');
			const { service, collectionRepository } = makeService();

			await expect(service.update(user, projectId, 'collection-1', changes)).rejects.toThrow(
				ForbiddenError,
			);
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('returns not found when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.update(user, projectId, 'collection-1', changes)).rejects.toThrow(
				NotFoundError,
			);
			expect(collectionRepository.updateNameAndDescription).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('deletes the collection of the project', async () => {
			const { service, collectionRepository } = makeService();

			await expect(service.delete(user, projectId, 'collection-1')).resolves.toEqual({
				success: true,
			});
			expect(collectionRepository.deleteSharedInProject).toHaveBeenCalledWith(
				'collection-1',
				projectId,
				{},
			);
		});

		it('does not look the collection up, so a missing one also answers success', async () => {
			const { service, collectionRepository } = makeService();

			await expect(service.delete(user, projectId, 'missing')).resolves.toEqual({
				success: true,
			});
			expect(collectionRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('returns forbidden for a user who cannot update agents in the project', async () => {
			grantScopes('agent:read');
			const { service, collectionRepository } = makeService();

			await expect(service.delete(user, projectId, 'collection-1')).rejects.toThrow(ForbiddenError);
			expect(collectionRepository.deleteSharedInProject).not.toHaveBeenCalled();
		});

		it('returns not found when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.delete(user, projectId, 'collection-1')).rejects.toThrow(NotFoundError);
			expect(collectionRepository.deleteSharedInProject).not.toHaveBeenCalled();
		});
	});

	describe('listForAgent', () => {
		it('lists the collections of the project by name, with the collections of the agent marked', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findSharedByProjectId.mockResolvedValue([
				mock<KnowledgeCollection>({ id: 'c-2', name: 'Returns', description: 'Refunds' }),
				mock<KnowledgeCollection>({ id: 'c-1', name: 'Pricing', description: null }),
			]);
			collectionRepository.findAgentCollectionIds.mockResolvedValue(['c-2']);
			collectionRepository.findFileTotals.mockResolvedValue(
				new Map([['c-2', { fileCount: 3, totalFileSizeBytes: 300 }]]),
			);

			await expect(service.listForAgent(user, projectId, 'agent-1')).resolves.toEqual([
				{ id: 'c-1', name: 'Pricing', description: '', fileCount: 0, usedByAgent: false },
				{ id: 'c-2', name: 'Returns', description: 'Refunds', fileCount: 3, usedByAgent: true },
			]);
			expect(collectionRepository.findFileTotals).toHaveBeenCalledOnce();
			expect(collectionRepository.findFileTotals).toHaveBeenCalledWith(['c-2', 'c-1'], {});
			expect(collectionRepository.findSharedByProjectId).toHaveBeenCalledWith(projectId, {});
			expect(collectionRepository.findAgentCollectionIds).toHaveBeenCalledWith('agent-1', {});
		});

		it('answers not found and reads nothing when collections are off', async () => {
			const { service, collectionRepository } = makeService({ collectionsFlag: false });

			await expect(service.listForAgent(user, projectId, 'agent-1')).rejects.toThrow(NotFoundError);
			expect(collectionRepository.findSharedByProjectId).not.toHaveBeenCalled();
		});

		it('refuses a user who cannot read agents in the project', async () => {
			grantScopes();
			const { service, collectionRepository } = makeService();

			await expect(service.listForAgent(user, projectId, 'agent-1')).rejects.toThrow(
				ForbiddenError,
			);
			expect(collectionRepository.findSharedByProjectId).not.toHaveBeenCalled();
		});
	});

	describe.each(['addAgent', 'removeAgent'] as const)('%s', (method) => {
		const ctx = { trx: undefined };
		const writeFence = vi.fn(async (write) => await write(ctx)) as KnowledgeWriteRunner;

		beforeEach(() => {
			vi.mocked(writeFence).mockClear();
		});

		it('writes the dependency row inside the fence', async () => {
			const { service, collectionRepository } = makeService();

			await service[method](user, ref, 'agent-1', writeFence);

			expect(writeFence).toHaveBeenCalledOnce();
			expect(collectionRepository[method]).toHaveBeenCalledWith('collection-1', 'agent-1', ctx);
		});

		it('answers not found and writes nothing when the collection is not in the project', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service[method](user, ref, 'agent-1', writeFence)).rejects.toThrow(
				NotFoundError,
			);
			expect(writeFence).not.toHaveBeenCalled();
			expect(collectionRepository[method]).not.toHaveBeenCalled();
		});
	});
});

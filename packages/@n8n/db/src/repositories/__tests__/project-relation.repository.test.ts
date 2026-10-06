import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { In, type SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ProjectRelation, Role } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectRelationRepository } from '../project-relation.repository';

describe('ProjectRelationRepository', () => {
	const entityManager = mockEntityManager(ProjectRelation);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('findPersonalOwnerEmails', () => {
		it('should map each personal project id to the email of its owner', async () => {
			const queryBuilder = mock<SelectQueryBuilder<ProjectRelation>>();
			queryBuilder.innerJoin.mockReturnThis();
			queryBuilder.select.mockReturnThis();
			queryBuilder.addSelect.mockReturnThis();
			queryBuilder.where.mockReturnThis();
			queryBuilder.andWhere.mockReturnThis();
			queryBuilder.getRawMany.mockResolvedValue([
				{ projectId: 'project1', email: 'owner@example.com' },
			]);
			vi.spyOn(projectRelationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const result = await projectRelationRepository.findPersonalOwnerEmails([
				'project1',
				'project1',
				'project2',
			]);

			expect(queryBuilder.where).toHaveBeenCalledWith(
				'projectRelation.projectId IN (:...projectIds)',
				{ projectIds: ['project1', 'project2'] },
			);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('projectRelation.role = :role', {
				role: PROJECT_OWNER_ROLE_SLUG,
			});
			expect(result).toEqual(new Map([['project1', 'owner@example.com']]));
		});

		it('should not query when there are no project ids', async () => {
			const createQueryBuilder = vi.spyOn(projectRelationRepository, 'createQueryBuilder');

			const result = await projectRelationRepository.findPersonalOwnerEmails([]);

			expect(createQueryBuilder).not.toHaveBeenCalled();
			expect(result).toEqual(new Map());
		});
	});

	describe('findAllByUser', () => {
		beforeEach(() => {
			entityManager.find.mockReset();
		});

		const relation = (projectId: string, roleSlug: string) =>
			({ userId: 'user1', projectId, role: { slug: roleSlug } }) as ProjectRelation;
		const role = (slug: string, ...scopeSlugs: string[]) =>
			({ slug, scopes: scopeSlugs.map((scopeSlug) => ({ slug: scopeSlug })) }) as Role;

		it('loads the relations without the eager role scopes', async () => {
			entityManager.find.mockResolvedValueOnce([relation('project1', 'project:admin')]);
			entityManager.find.mockResolvedValueOnce([role('project:admin', 'workflow:read')]);

			await projectRelationRepository.findAllByUser('user1');

			expect(entityManager.find).toHaveBeenNthCalledWith(1, ProjectRelation, {
				where: { userId: 'user1' },
				relations: { role: true, project: false },
				loadEagerRelations: false,
			});
		});

		it('joins the project only when asked to', async () => {
			entityManager.find.mockResolvedValueOnce([relation('project1', 'project:admin')]);
			entityManager.find.mockResolvedValueOnce([role('project:admin', 'workflow:read')]);

			await projectRelationRepository.findAllByUser('user1', { withProject: true });

			expect(entityManager.find).toHaveBeenNthCalledWith(
				1,
				ProjectRelation,
				expect.objectContaining({ relations: { role: true, project: true } }),
			);
		});

		it('attaches the scopes of each role from one query over the distinct roles', async () => {
			entityManager.find.mockResolvedValueOnce([
				relation('project1', 'project:admin'),
				relation('project2', 'project:editor'),
				relation('project3', 'project:admin'),
			]);
			entityManager.find.mockResolvedValueOnce([
				role('project:admin', 'workflow:read', 'workflow:update'),
				role('project:editor', 'workflow:read'),
			]);

			const result = await projectRelationRepository.findAllByUser('user1');

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenNthCalledWith(2, Role, {
				where: { slug: In(['project:admin', 'project:editor']) },
				relations: ['scopes'],
			});
			expect(result.map((r) => r.role.scopes.map((s) => s.slug))).toEqual([
				['workflow:read', 'workflow:update'],
				['workflow:read'],
				['workflow:read', 'workflow:update'],
			]);
		});

		it('leaves the scopes empty for a role the query did not return', async () => {
			entityManager.find.mockResolvedValueOnce([relation('project1', 'project:custom')]);
			entityManager.find.mockResolvedValueOnce([]);

			const [result] = await projectRelationRepository.findAllByUser('user1');

			expect(result.role.scopes).toEqual([]);
		});

		it('does not query the roles when the user has no relations', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			const result = await projectRelationRepository.findAllByUser('user1');

			expect(result).toEqual([]);
			expect(entityManager.find).toHaveBeenCalledTimes(1);
		});
	});

	describe('membership operations', () => {
		const relation = (userId: string, roleSlug: string) =>
			({ userId, projectId: 'project1', role: { slug: roleSlug } }) as ProjectRelation;

		beforeEach(() => {
			entityManager.find.mockReset();
		});

		it('finds memberships without eager scopes and then attaches them', async () => {
			const projectRelation = relation('user1', 'project:viewer');
			entityManager.find.mockResolvedValueOnce([projectRelation]);
			entityManager.find.mockResolvedValueOnce([
				{ slug: 'project:viewer', scopes: [{ slug: 'workflow:read' }] } as Role,
			]);

			const result = await projectRelationRepository.findForUserInProjects('user1', ['project1']);

			expect(entityManager.find).toHaveBeenNthCalledWith(1, ProjectRelation, {
				where: { userId: 'user1', projectId: In(['project1']) },
				relations: ['role'],
				loadEagerRelations: false,
			});
			expect(result[0].role.scopes.map(({ slug }) => slug)).toEqual(['workflow:read']);
		});

		it('replaces every project member through the operation context', async () => {
			await projectRelationRepository.replaceProjectMembers(
				'project1',
				[{ userId: 'user1', role: 'project:viewer' }],
				{},
			);

			expect(entityManager.delete).toHaveBeenCalledWith(ProjectRelation, {
				projectId: 'project1',
			});
			expect(entityManager.insert).toHaveBeenCalledWith(ProjectRelation, [
				{ projectId: 'project1', userId: 'user1', role: { slug: 'project:viewer' } },
			]);
		});

		it('updates and deletes one project member', async () => {
			await projectRelationRepository.updateProjectMemberRole(
				'project1',
				'user1',
				'project:editor',
				{},
			);
			await projectRelationRepository.deleteProjectMember('project1', 'user1', {});

			expect(entityManager.update).toHaveBeenCalledWith(
				ProjectRelation,
				{ projectId: 'project1', userId: 'user1' },
				{ role: { slug: 'project:editor' } },
			);
			expect(entityManager.delete).toHaveBeenCalledWith(ProjectRelation, {
				projectId: 'project1',
				userId: 'user1',
			});
		});

		it('maps page bounds for member lists', async () => {
			entityManager.findAndCount.mockResolvedValueOnce([[], 0]);

			await projectRelationRepository.findMembersAndCount('project1', {
				offset: 20,
				limit: 10,
			});

			expect(entityManager.findAndCount).toHaveBeenCalledWith(ProjectRelation, {
				where: { projectId: 'project1' },
				relations: { user: true, role: true },
				order: { createdAt: 'ASC', userId: 'ASC' },
				skip: 20,
				take: 10,
			});
		});
	});

	describe('findProjectIdsByUserIds', () => {
		beforeEach(() => {
			entityManager.find.mockReset();
		});

		it('maps each user id to every project id they belong to', async () => {
			entityManager.find.mockResolvedValueOnce([
				{ userId: 'user1', projectId: 'project1' },
				{ userId: 'user1', projectId: 'project2' },
				{ userId: 'user2', projectId: 'project3' },
			]);

			const result = await projectRelationRepository.findProjectIdsByUserIds(['user1', 'user2']);

			expect(result).toEqual(
				new Map([
					['user1', ['project1', 'project2']],
					['user2', ['project3']],
				]),
			);
		});

		it('queries once for several user ids, not once per user', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await projectRelationRepository.findProjectIdsByUserIds(['user1', 'user2', 'user1']);

			expect(entityManager.find).toHaveBeenCalledTimes(1);
		});

		it('does not query when there are no user ids', async () => {
			const result = await projectRelationRepository.findProjectIdsByUserIds([]);

			expect(entityManager.find).not.toHaveBeenCalled();
			expect(result).toEqual(new Map());
		});
	});
});

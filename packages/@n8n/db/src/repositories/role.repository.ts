import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, Repository } from '@n8n/typeorm';
import { jsonParse, UserError } from 'n8n-workflow';

import { Project, ProjectRelation, Role, User } from '../entities';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}

	async findAll(trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.find(Role, { relations: ['scopes'] });
	}

	async countUsersWithRole(role: Role): Promise<number> {
		if (role.roleType === 'global') {
			return await this.manager.getRepository(User).count({
				where: {
					role: {
						slug: role.slug,
					},
				},
			});
		} else if (role.roleType === 'project') {
			return await this.manager.getRepository(ProjectRelation).count({
				where: { role: { slug: role.slug } },
			});
		}

		return 0;
	}

	async findAllRoleCounts() {
		const userCount = await this.manager
			.createQueryBuilder(User, 'user')
			.select('user.roleSlug', 'roleSlug')
			.addSelect('COUNT(user.id)', 'count')
			.groupBy('user.roleSlug')
			.getRawMany<{ roleSlug: string; count: string }>();

		const projectCount = await this.manager
			.createQueryBuilder(ProjectRelation, 'projectRelation')
			.select('projectRelation.role', 'roleSlug')
			.addSelect('COUNT(projectRelation.user)', 'count')
			.groupBy('projectRelation.role')
			.getRawMany<{ roleSlug: string; count: string }>();

		return userCount.concat(projectCount).reduce(
			(acc, { roleSlug, count }) => {
				if (!acc[roleSlug]) {
					acc[roleSlug] = 0;
				}
				acc[roleSlug] += parseInt(count, 10);
				return acc;
			},
			{} as Record<string, number>,
		);
	}

	async findAllProjectCounts(): Promise<Record<string, number>> {
		const results = await this.manager
			.createQueryBuilder(ProjectRelation, 'pr')
			.select('pr.role', 'roleSlug')
			.addSelect('COUNT(DISTINCT pr.projectId)', 'count')
			.groupBy('pr.role')
			.getRawMany<{ roleSlug: string; count: string }>();

		return results.reduce(
			(acc, { roleSlug, count }) => {
				acc[roleSlug] = parseInt(count, 10);
				return acc;
			},
			{} as Record<string, number>,
		);
	}

	async findProjectAssignments(roleSlug: string): Promise<
		Array<{
			projectId: string;
			projectName: string;
			projectIcon: { type: string; value: string } | null;
			memberCount: number;
			lastAssigned: string | null;
		}>
	> {
		const results = await this.manager
			.createQueryBuilder(ProjectRelation, 'pr')
			.innerJoin(Project, 'project', 'project.id = pr.projectId')
			.select('project.id', 'projectId')
			.addSelect('project.name', 'projectName')
			.addSelect('project.icon', 'projectIcon')
			.addSelect('COUNT(pr.userId)', 'memberCount')
			.addSelect('MAX(pr.createdAt)', 'lastAssigned')
			.where('pr.role = :roleSlug', { roleSlug })
			.groupBy('project.id')
			.addGroupBy('project.name')
			.addGroupBy('project.icon')
			.getRawMany<{
				projectId: string;
				projectName: string;
				projectIcon: string | { type: string; value: string } | null;
				memberCount: string;
				lastAssigned: string | null;
			}>();

		return results.map((r) => ({
			projectId: r.projectId,
			projectName: r.projectName,
			projectIcon:
				typeof r.projectIcon === 'string'
					? jsonParse<{ type: string; value: string } | null>(r.projectIcon, {
							fallbackValue: null,
						})
					: r.projectIcon,
			memberCount: parseInt(r.memberCount, 10),
			lastAssigned: r.lastAssigned ?? null,
		}));
	}

	async findAllProjectMembers(projectId: string): Promise<
		Array<{
			userId: string;
			firstName: string | null;
			lastName: string | null;
			email: string;
			role: string;
		}>
	> {
		return await this.manager
			.createQueryBuilder(ProjectRelation, 'pr')
			.innerJoin(User, 'user', 'user.id = pr.userId')
			.select('user.id', 'userId')
			.addSelect('user.firstName', 'firstName')
			.addSelect('user.lastName', 'lastName')
			.addSelect('user.email', 'email')
			.addSelect('pr.role', 'role')
			.where('pr.projectId = :projectId', { projectId })
			.getRawMany();
	}

	async findBySlug(slug: string) {
		return await this.findOne({
			where: { slug },
			relations: ['scopes'],
		});
	}

	async findBySlugs(slugs: string[], roleType: 'global' | 'project' | 'workflow' | 'credential') {
		return await this.find({
			where: { slug: In(slugs), roleType },
			relations: ['scopes'],
		});
	}

	async removeBySlug(slug: string) {
		const result = await this.delete({ slug });
		if (result.affected !== 1) {
			throw new Error(`Failed to delete role "${slug}"`);
		}
	}

	private async updateEntityWithManager(
		entityManager: EntityManager,
		slug: string,
		newData: Partial<Pick<Role, 'description' | 'scopes' | 'displayName'>>,
	) {
		const role = await entityManager.findOne(Role, {
			where: { slug },
			relations: ['scopes'],
		});
		if (!role) {
			throw new UserError('Role not found');
		}
		if (role.systemRole) {
			throw new UserError('Cannot update system roles');
		}

		// Only update fields that are explicitly provided (not undefined)
		// This preserves existing scopes when scopes is undefined
		if (newData.displayName !== undefined) {
			role.displayName = newData.displayName;
		}

		if (newData.description !== undefined) {
			role.description = newData.description;
		}

		if (newData.scopes !== undefined) {
			role.scopes = newData.scopes;
		}

		return await entityManager.save<Role>(role);
	}

	async updateRole(
		slug: string,
		newData: Partial<Pick<Role, 'description' | 'scopes' | 'displayName'>>,
	) {
		return await this.manager.transaction(async (transactionManager) => {
			return await this.updateEntityWithManager(transactionManager, slug, newData);
		});
	}
}

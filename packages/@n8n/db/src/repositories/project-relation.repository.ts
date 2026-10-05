import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG, type ProjectRole } from '@n8n/permissions';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { ProjectRelation, Role } from '../entities';
import { chunkIds } from '../utils/chunk-ids';

@Service()
export class ProjectRelationRepository extends Repository<ProjectRelation> {
	constructor(dataSource: DataSource) {
		super(ProjectRelation, dataSource.manager);
	}

	async findPersonalOwnerEmails(projectIds: string[]): Promise<Map<string, string>> {
		const ownerEmails = new Map<string, string>();
		for (const chunk of chunkIds([...new Set(projectIds)])) {
			const rows = await this.createQueryBuilder('projectRelation')
				.innerJoin('projectRelation.user', 'user')
				.select('projectRelation.projectId', 'projectId')
				.addSelect('user.email', 'email')
				.where('projectRelation.projectId IN (:...projectIds)', { projectIds: chunk })
				.andWhere('projectRelation.role = :role', { role: PROJECT_OWNER_ROLE_SLUG })
				.getRawMany<{ projectId: string; email: string }>();
			for (const { projectId, email } of rows) ownerEmails.set(projectId, email);
		}
		return ownerEmails;
	}

	async getPersonalProjectOwners(projectIds: string[]) {
		return await this.find({
			where: {
				projectId: In(projectIds),
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
			},
			relations: {
				user: {
					role: true,
				},
			},
		});
	}

	async getPersonalProjectsForUsers(userIds: string[]) {
		const projectRelations = await this.find({
			where: {
				userId: In(userIds),
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
			},
		});

		return projectRelations.map((pr) => pr.projectId);
	}

	async getAccessibleProjectsByRoles(userId: string, roles: string[]) {
		const projectRelations = await this.find({
			where: { userId, role: { slug: In(roles) } },
		});

		return projectRelations.map((pr) => pr.projectId);
	}

	/**
	 * Find the role of a user in a project.
	 */
	async findProjectRole({ userId, projectId }: { userId: string; projectId: string }) {
		const relation = await this.findOneBy({ projectId, userId });

		return relation?.role ?? null;
	}

	/** Counts the number of users in each role, e.g. `{ admin: 2, member: 6, owner: 1 }` */
	async countUsersByRole() {
		const rows = (await this.createQueryBuilder()
			.select(['role', 'COUNT(role) as count'])
			.groupBy('role')
			.execute()) as Array<{ role: ProjectRole; count: string }>;
		return rows.reduce(
			(acc, row) => {
				acc[row.role] = parseInt(row.count, 10);
				return acc;
			},
			{} as Record<ProjectRole, number>,
		);
	}

	async findUserIdsByProjectId(projectId: string): Promise<string[]> {
		const rows = await this.find({
			select: ['userId'],
			where: { projectId },
		});

		return [...new Set(rows.map((r) => r.userId))];
	}

	/**
	 * Every relation of a user, with its role and the role's scopes, and with the
	 * project when `withProject` is set.
	 *
	 * `Role.scopes` is eager, so a plain `find` with `role` joins every scope of every
	 * role: the database returns (relations x scopes of the role) rows, about 70 per
	 * project for `project:admin`. A user in hundreds of projects pays tens of
	 * thousands of rows to transfer and hydrate on every call. Load the relations
	 * without the eager join and attach the scopes from one query over the distinct
	 * roles instead, so the row count follows the number of relations.
	 */
	async findAllByUser(
		userId: string,
		{ withProject = false }: { withProject?: boolean } = {},
	): Promise<ProjectRelation[]> {
		const relations = await this.find({
			where: { userId },
			relations: { role: true, project: withProject },
			loadEagerRelations: false,
		});
		await this.attachRoleScopes(relations);
		return relations;
	}

	private async attachRoleScopes(relations: ProjectRelation[]): Promise<void> {
		const slugs = [...new Set(relations.map((relation) => relation.role.slug))];
		if (slugs.length === 0) return;

		const roles = await this.manager.find(Role, {
			where: { slug: In(slugs) },
			relations: ['scopes'],
		});
		const scopesBySlug = new Map(roles.map((role) => [role.slug, role.scopes]));
		for (const relation of relations) {
			relation.role.scopes = scopesBySlug.get(relation.role.slug) ?? [];
		}
	}

	/**
	 * The project ids each of `userIds` belongs to, in any role, as a map from
	 * user id to their project ids. One query for every user, instead of one
	 * query per user.
	 */
	async findProjectIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
		const result = new Map<string, string[]>();
		if (userIds.length === 0) return result;

		for (const chunk of chunkIds([...new Set(userIds)])) {
			const rows = await this.find({
				select: ['userId', 'projectId'],
				where: { userId: In(chunk) },
			});
			for (const { userId, projectId } of rows) {
				const projectIds = result.get(userId);
				if (projectIds) projectIds.push(projectId);
				else result.set(userId, [projectId]);
			}
		}

		return result;
	}
}

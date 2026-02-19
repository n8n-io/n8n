import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG, type ProjectRole } from '@n8n/permissions';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { ProjectRelation } from '../entities';

@Service()
export class ProjectRelationRepository extends Repository<ProjectRelation> {
	constructor(dataSource: DataSource) {
		super(ProjectRelation, dataSource.manager);
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

	/** Returns users assigned to a specific role, along with which project they're in */
	async findUsersByRoleSlug(roleSlug: string) {
		return await this.createQueryBuilder('pr')
			.innerJoin('pr.user', 'user')
			.innerJoin('pr.project', 'project')
			.select([
				'user.id AS "userId"',
				'user.email AS "email"',
				'user.firstName AS "firstName"',
				'user.lastName AS "lastName"',
				'project.id AS "projectId"',
				'project.name AS "projectName"',
			])
			.where('pr.role = :roleSlug', { roleSlug })
			.getRawMany<{
				userId: string;
				email: string;
				firstName: string;
				lastName: string;
				projectId: string;
				projectName: string;
			}>();
	}

	async findAllByUser(userId: string) {
		return await this.find({
			where: {
				userId,
			},
			relations: { role: true },
		});
	}
}

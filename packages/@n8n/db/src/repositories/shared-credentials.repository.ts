import { Service } from '@n8n/di';
import type { CredentialSharingRole, Scope } from '@n8n/permissions';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { EntityManager, FindOptionsWhere, SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';

import type { User } from '../entities';
import { Project, ProjectRelation, SharedCredentials } from '../entities';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(dataSource: DataSource) {
		super(SharedCredentials, dataSource.manager);
	}

	async findByCredentialIds(credentialIds: string[], role: CredentialSharingRole) {
		return await this.find({
			relations: { credentials: true, project: { projectRelations: { user: true, role: true } } },
			where: {
				credentialsId: In(credentialIds),
				role,
			},
		});
	}

	async makeOwnerOfAllCredentials(project: Project) {
		return await this.update(
			{
				projectId: Not(project.id),
				role: 'credential:owner',
			},
			{ project },
		);
	}

	async makeOwner(credentialIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.upsert(
			SharedCredentials,
			credentialIds.map(
				(credentialsId) =>
					({
						projectId,
						credentialsId,
						role: 'credential:owner',
					}) as const,
			),
			['projectId', 'credentialsId'],
		);
	}

	async deleteByIds(sharedCredentialsIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.delete(SharedCredentials, {
			projectId,
			credentialsId: In(sharedCredentialsIds),
		});
	}

	async getFilteredAccessibleCredentials(
		projectIds: string[],
		credentialsIds: string[],
	): Promise<string[]> {
		return (
			await this.find({
				where: {
					projectId: In(projectIds),
					credentialsId: In(credentialsIds),
				},
				select: ['credentialsId'],
			})
		).map((s) => s.credentialsId);
	}

	async findCredentialOwningProject(credentialsId: string) {
		return (
			await this.findOne({
				where: { credentialsId, role: 'credential:owner' },
				relations: { project: true },
			})
		)?.project;
	}

	async getAllRelationsForCredentials(credentialIds: string[]) {
		return await this.find({
			where: {
				credentialsId: In(credentialIds),
			},
			relations: ['project'],
		});
	}

	async getSharedPersonalCredentialsCount(): Promise<number> {
		return await this.createQueryBuilder('sc')
			.innerJoin('sc.project', 'project')
			.where('sc.role = :role', { role: 'credential:owner' })
			.andWhere('project.type = :type', { type: 'personal' })
			.andWhere((qb) => {
				const subQuery = qb
					.subQuery()
					.select('1')
					.from(SharedCredentials, 'other')
					.where('other.credentialsId = sc.credentialsId')
					.andWhere('other.projectId != sc.projectId')
					.getQuery();
				return `EXISTS ${subQuery}`;
			})
			.getCount();
	}

	async findCredentialsWithOptions(
		where: FindOptionsWhere<SharedCredentials> = {},
		trx?: EntityManager,
	) {
		trx = trx ?? this.manager;

		return await trx.find(SharedCredentials, {
			where,
			relations: {
				credentials: {
					shared: { project: true },
				},
			},
		});
	}

	async findCredentialsByRoles(
		userIds: string[],
		projectRoles: string[],
		credentialRoles: string[],
		trx?: EntityManager,
	) {
		trx = trx ?? this.manager;

		return await trx.find(SharedCredentials, {
			where: {
				role: In(credentialRoles),
				project: {
					projectRelations: {
						userId: In(userIds),
						role: { slug: In(projectRoles) },
					},
				},
			},
		});
	}

	/**
	 * Build a subquery that returns credential IDs based on sharing permissions.
	 * This replicates the logic from CredentialsFinderService but as a subquery.
	 *
	 * This is used to optimize credential queries at scale by combining the sharing logic
	 * into a single database query instead of fetching IDs first and then querying credentials.
	 */
	buildSharedCredentialIdsSubquery(
		user: User,
		sharingOptions: {
			scopes?: Scope[];
			projectRoles?: string[];
			credentialRoles?: string[];
			isPersonalProject?: boolean;
			personalProjectOwnerId?: string;
			onlySharedWithMe?: boolean;
			projectId?: string;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): SelectQueryBuilder<any> {
		const {
			projectRoles,
			credentialRoles,
			isPersonalProject,
			personalProjectOwnerId,
			onlySharedWithMe,
			projectId,
		} = sharingOptions;

		const subquery = this.manager
			.createQueryBuilder()
			.select('sc.credentialsId')
			.from(SharedCredentials, 'sc');

		// Handle different sharing scenarios
		// Check explicit filters first (isPersonalProject, onlySharedWithMe) before falling back to user's global permissions
		if (isPersonalProject) {
			// Personal project - get owned credentials using the project owner's ID (not the requesting user's)
			const ownerUserId = personalProjectOwnerId ?? user.id;
			subquery
				.innerJoin(Project, 'p', 'sc.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sc.role = :ownerRole', { ownerRole: 'credential:owner' })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: ownerUserId })
				.andWhere('pr.role = :projectOwnerRole', { projectOwnerRole: PROJECT_OWNER_ROLE_SLUG });

			// Filter by the specific project ID when specified
			if (projectId && typeof projectId === 'string' && projectId !== '') {
				subquery.andWhere('sc.projectId = :subqueryProjectId', { subqueryProjectId: projectId });
			}
		} else if (onlySharedWithMe) {
			// Shared with me - credentials shared (as user) to user's personal project
			subquery
				.innerJoin(Project, 'p', 'sc.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sc.role = :userRole', { userRole: 'credential:user' })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: user.id })
				.andWhere('pr.role = :projectOwnerRole', { projectOwnerRole: PROJECT_OWNER_ROLE_SLUG });
		} else if (hasGlobalScope(user, 'credential:read')) {
			// User has global scope - return all credential IDs in the specified project (if any)
			if (projectId && typeof projectId === 'string' && projectId !== '') {
				subquery.where('sc.projectId = :subqueryProjectId', { subqueryProjectId: projectId });
			}
		} else {
			// Standard sharing based on roles
			if (!credentialRoles || !projectRoles) {
				throw new Error(
					'credentialRoles and projectRoles are required when not using special cases',
				);
			}

			subquery
				.innerJoin(Project, 'p', 'sc.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sc.role IN (:...credentialRoles)', { credentialRoles })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: user.id })
				.andWhere('pr.role IN (:...projectRoles)', { projectRoles });

			// Filter by the specific project ID when specified
			if (projectId && typeof projectId === 'string' && projectId !== '') {
				subquery.andWhere('sc.projectId = :subqueryProjectId', { subqueryProjectId: projectId });
			}
		}

		return subquery;
	}
}

import { Service } from '@n8n/di';
import type { CredentialSharingRole, ProjectRole } from '@n8n/permissions';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';

import type { Project } from '../entities';
import { SharedCredentials } from '../entities';

@Service()
export class SharedCredentialsRepository extends Repository<SharedCredentials> {
	constructor(dataSource: DataSource) {
		super(SharedCredentials, dataSource.manager);
	}

	async findByCredentialIds(credentialIds: string[], role: CredentialSharingRole) {
		return await this.find({
			relations: { credentials: true, project: { projectRelations: { user: true } } },
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

	async findCredentialsWithOptions(
		where: FindOptionsWhere<SharedCredentials> = {},
		trx?: EntityManager,
	) {
		trx = trx ?? this.manager;

		return await trx.find(SharedCredentials, {
			where,
			relations: {
				credentials: {
					shared: { project: { projectRelations: { user: true } } },
				},
			},
		});
	}

	async findCredentialsByRoles(
		userIds: string[],
		projectRoles: ProjectRole[],
		credentialRoles: CredentialSharingRole[],
		trx?: EntityManager,
	) {
		trx = trx ?? this.manager;

		return await trx.find(SharedCredentials, {
			where: {
				role: In(credentialRoles),
				project: {
					projectRelations: {
						userId: In(userIds),
						role: In(projectRoles),
					},
				},
			},
		});
	}
}

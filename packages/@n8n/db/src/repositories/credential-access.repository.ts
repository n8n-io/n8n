import { Service } from '@n8n/di';
import { DataSource, In, IsNull } from '@n8n/typeorm';

import { CredentialsEntity, type Project, Role, SharedCredentials } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { chunkIds } from '../utils/chunk-ids';
import { BaseRepository } from './base-repository';

export type CredentialAccessRoles = {
	userId: string;
	projectRoles: string[];
	credentialRoles: string[];
};

@Service()
export class CredentialAccessRepository extends BaseRepository<SharedCredentials> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SharedCredentials, dataSource.manager, transactionRunner);
	}

	async findRolesForAccessCheck(ctx: OperationContext = {}): Promise<Role[]> {
		return await this.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}

	async findGlobalProjectCredentials(ctx: OperationContext = {}): Promise<CredentialsEntity[]> {
		return await this.managerFor(ctx).find(CredentialsEntity, {
			where: {
				isGlobal: true,
				usageScope: 'project',
				pendingAuthorizationExpiresAt: IsNull(),
			},
			relations: { shared: true },
		});
	}

	async findGlobalProjectCredentialById(
		credentialId: string,
		includeSharedProject: boolean,
		ctx: OperationContext = {},
	): Promise<CredentialsEntity | null> {
		return await this.managerFor(ctx).findOne(CredentialsEntity, {
			where: { id: credentialId, isGlobal: true, usageScope: 'project' },
			relations: includeSharedProject ? { shared: { project: true } } : undefined,
		});
	}

	async findCredentialById(
		credentialId: string,
		options: { includeInstanceCredentials: boolean; includeSharedProject: boolean },
		ctx: OperationContext = {},
	): Promise<CredentialsEntity | null> {
		return await this.managerFor(ctx).findOne(CredentialsEntity, {
			where: {
				id: credentialId,
				usageScope: options.includeInstanceCredentials ? In(['project', 'instance']) : 'project',
			},
			relations: options.includeSharedProject ? { shared: { project: true } } : undefined,
		});
	}

	async findInstanceCredentialById(
		credentialId: string,
		ctx: OperationContext = {},
	): Promise<CredentialsEntity | null> {
		return await this.managerFor(ctx).findOneBy(CredentialsEntity, {
			id: credentialId,
			usageScope: 'instance',
		});
	}

	async findProjectCredentialsForUser(
		access: CredentialAccessRoles | null,
		ctx: OperationContext = {},
	): Promise<CredentialsEntity[]> {
		return await this.managerFor(ctx).find(CredentialsEntity, {
			where: {
				isGlobal: false,
				usageScope: 'project',
				pendingAuthorizationExpiresAt: IsNull(),
				...(access
					? {
							shared: {
								role: In(access.credentialRoles),
								project: {
									projectRelations: {
										role: In(access.projectRoles),
										userId: access.userId,
									},
								},
							},
						}
					: {}),
			},
			relations: { shared: true },
		});
	}

	async findProjectCredentialForUser(
		credentialId: string,
		access: CredentialAccessRoles | null,
		ctx: OperationContext = {},
	): Promise<CredentialsEntity | null> {
		const sharedCredential = await this.managerFor(ctx).findOne(SharedCredentials, {
			where: {
				credentialsId: credentialId,
				...(access
					? {
							role: In(access.credentialRoles),
							project: {
								projectRelations: {
									role: In(access.projectRoles),
									userId: access.userId,
								},
							},
						}
					: {}),
			},
			relations: { credentials: { shared: { project: true } } },
		});

		return sharedCredential?.credentials.usageScope === 'project'
			? sharedCredential.credentials
			: null;
	}

	async findAllProjectCredentialsForUser(
		access: CredentialAccessRoles | null,
		ctx: OperationContext = {},
	) {
		const rows = await this.managerFor(ctx).find(SharedCredentials, {
			where: {
				credentials: { usageScope: 'project' },
				...(access
					? {
							role: In(access.credentialRoles),
							project: {
								projectRelations: {
									role: In(access.projectRoles),
									userId: access.userId,
								},
							},
						}
					: {}),
			},
			relations: { credentials: { shared: { project: true } } },
		});

		return rows.map((row) => ({ ...row.credentials, projectId: row.projectId }));
	}

	async findProjectCredentialIdsForUser(
		credentialIds: string[],
		access: CredentialAccessRoles | null,
		ctx: OperationContext = {},
	): Promise<Set<string>> {
		const result = new Set<string>();
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(credentialIds)) {
			const rows = await manager.find(SharedCredentials, {
				select: { credentialsId: true },
				where: {
					credentialsId: In(chunk),
					credentials: { usageScope: 'project' },
					...(access
						? {
								role: In(access.credentialRoles),
								project: {
									projectRelations: {
										role: In(access.projectRoles),
										userId: access.userId,
									},
								},
							}
						: {}),
				},
			});
			for (const row of rows) result.add(row.credentialsId);
		}
		return result;
	}

	async findGlobalProjectCredentialIds(
		credentialIds: string[],
		resolvableOnly: boolean,
		ctx: OperationContext = {},
	): Promise<string[]> {
		const ids: string[] = [];
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(credentialIds)) {
			const rows = await manager.find(CredentialsEntity, {
				select: { id: true },
				where: {
					id: In(chunk),
					isGlobal: true,
					usageScope: 'project',
					...(resolvableOnly ? { isResolvable: true } : {}),
				},
			});
			ids.push(...rows.map((row) => row.id));
		}
		return ids;
	}

	async findExistingCredentialIds(
		credentialIds: string[],
		ctx: OperationContext = {},
	): Promise<string[]> {
		if (credentialIds.length === 0) return [];
		const rows = await this.managerFor(ctx).find(CredentialsEntity, {
			select: { id: true },
			where: { id: In(credentialIds) },
		});
		return rows.map((row) => row.id);
	}

	async findCredentialNames(
		credentialIds: string[],
		ctx: OperationContext = {},
	): Promise<Array<Pick<CredentialsEntity, 'id' | 'name'>>> {
		if (credentialIds.length === 0) return [];
		return await this.managerFor(ctx).find(CredentialsEntity, {
			select: { id: true, name: true },
			where: { id: In(credentialIds) },
		});
	}

	async findOwnerProjectsByCredentialIds(
		credentialIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, Project>> {
		const projects = new Map<string, Project>();
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(credentialIds)) {
			const rows = await manager.find(SharedCredentials, {
				where: { credentialsId: In(chunk), role: 'credential:owner' },
				relations: { project: true },
			});
			for (const row of rows) projects.set(row.credentialsId, row.project);
		}
		return projects;
	}

	async findCredentialIdsByUserAndRoles(
		userIds: string[],
		projectRoles: string[],
		credentialRoles: string[],
		ctx: OperationContext = {},
	): Promise<string[]> {
		const rows = await this.managerFor(ctx).find(SharedCredentials, {
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
		return rows.map((row) => row.credentialsId);
	}
}

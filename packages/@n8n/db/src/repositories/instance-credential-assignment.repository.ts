import { Service } from '@n8n/di';
import { DataSource, In, QueryFailedError, type EntityManager } from '@n8n/typeorm';

import { CredentialsEntity, InstanceCredentialAssignment } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

@Service()
export class InstanceCredentialAssignmentRepository extends BaseRepository<InstanceCredentialAssignment> {
	constructor(dataSource: DataSource) {
		super(InstanceCredentialAssignment, dataSource.manager);
	}

	async findAvailableCredentials(
		credentialTypes: readonly string[],
		ctx: OperationContext = {},
	): Promise<CredentialsEntity[]> {
		return await this.managerFor(ctx).find(CredentialsEntity, {
			select: ['id', 'name', 'type'],
			where: {
				availability: 'instance',
				type: In([...credentialTypes]),
			},
			order: { name: 'ASC' },
		});
	}

	async assignCredential(
		credentialUseId: string,
		credentialId: string,
		credentialTypes: readonly string[],
		ctx: OperationContext = {},
	): Promise<CredentialsEntity | null> {
		const manager = this.managerFor(ctx);
		const credential = await this.findCredential(credentialId, credentialTypes, manager);
		if (!credential) return null;

		try {
			await manager.upsert(InstanceCredentialAssignment, { credentialUseId, credentialId }, [
				'credentialUseId',
			]);
		} catch (error) {
			// Distinguish a concurrent deletion from a transient database failure.
			if (error instanceof QueryFailedError) {
				const stillExists = await this.findCredential(credentialId, credentialTypes, manager)
					.then((found) => Boolean(found))
					.catch(() => true);
				if (!stillExists) return null;
			}
			throw error;
		}

		return credential;
	}

	async clearCredential(credentialUseId: string, ctx: OperationContext = {}): Promise<void> {
		const manager = this.managerFor(ctx);
		await manager.delete(InstanceCredentialAssignment, { credentialUseId });
	}

	async findAssignedCredentialId(
		credentialUseId: string,
		ctx: OperationContext = {},
	): Promise<string | null> {
		const manager = this.managerFor(ctx);
		const assignment = await manager.findOneBy(InstanceCredentialAssignment, { credentialUseId });
		return assignment?.credentialId ?? null;
	}

	async findAssignedCredential(
		credentialUseId: string,
		credentialTypes: readonly string[],
		ctx: OperationContext = {},
	): Promise<{ credentialId: string; credential: CredentialsEntity | null } | null> {
		const manager = this.managerFor(ctx);
		const assignment = await manager.findOneBy(InstanceCredentialAssignment, { credentialUseId });
		if (!assignment) return null;

		return {
			credentialId: assignment.credentialId,
			credential: await this.findCredential(assignment.credentialId, credentialTypes, manager),
		};
	}

	private async findCredential(
		credentialId: string,
		credentialTypes: readonly string[],
		manager: EntityManager,
	): Promise<CredentialsEntity | null> {
		return await manager.findOne(CredentialsEntity, {
			where: {
				id: credentialId,
				availability: 'instance',
				type: In([...credentialTypes]),
			},
		});
	}
}

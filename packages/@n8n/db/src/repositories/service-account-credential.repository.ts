import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ServiceAccountCredential } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

type NewServiceAccountCredential = {
	userId: string;
	credentialType: string;
	clientId: string;
	clientSecret: string;
};

@Service()
export class ServiceAccountCredentialRepository extends BaseRepository<ServiceAccountCredential> {
	constructor(dataSource: DataSource) {
		super(ServiceAccountCredential, dataSource.manager);
	}

	async insertCredential(cred: NewServiceAccountCredential, ctx: OperationContext): Promise<void> {
		// The `id` column has no DB-side default, and TypeORM only auto-generates
		// uuids for drivers that report no native support (sqlite), so Postgres
		// would insert NULL. Generate it here, as `chat_hub_agents` does.
		await this.managerFor(ctx).insert(ServiceAccountCredential, { id: uuidv4(), ...cred });
	}

	async findByClientId(
		clientId: string,
		ctx: OperationContext,
	): Promise<ServiceAccountCredential | null> {
		return await this.managerFor(ctx).findOne(ServiceAccountCredential, {
			where: { clientId },
			relations: { user: true },
		});
	}

	async findByUserId(userId: string, ctx: OperationContext): Promise<ServiceAccountCredential[]> {
		return await this.managerFor(ctx).find(ServiceAccountCredential, {
			where: { userId },
		});
	}

	/** Delete a credential by id. Returns the rows affected. */
	async deleteById(id: string, ctx: OperationContext): Promise<number> {
		const result = await this.managerFor(ctx).delete(ServiceAccountCredential, { id });
		return result.affected ?? 0;
	}
}

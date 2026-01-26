import { Service } from '@n8n/di';
import { DataSource, DeleteResult, Repository, UpdateResult } from '@n8n/typeorm';

import { SecretsProviderConnection } from '../entities';

@Service()
export class SecretsProviderConnectionRepository extends Repository<SecretsProviderConnection> {
	constructor(dataSource: DataSource) {
		super(SecretsProviderConnection, dataSource.manager);
	}

	async findAll(): Promise<SecretsProviderConnection[]> {
		return await this.find();
	}

	async findOneByProviderKey(providerKey: string): Promise<SecretsProviderConnection | null> {
		return await this.findOne({ where: { providerKey } });
	}

	async updateByProviderKey(
		providerKey: string,
		connection: Partial<SecretsProviderConnection>,
	): Promise<UpdateResult> {
		return await this.update(
			{ providerKey },
			{
				...connection,
				providerKey,
			},
		);
	}

	async deleteByProviderKey(providerKey: string): Promise<DeleteResult> {
		return await this.delete({ providerKey });
	}
}

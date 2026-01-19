import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ExternalSecretsProvider } from '../entities/external-secrets-provider.entity';

@Service()
export class ExternalSecretsProviderRepository extends Repository<ExternalSecretsProvider> {
	constructor(dataSource: DataSource) {
		super(ExternalSecretsProvider, dataSource.manager);
	}

	async findAll(): Promise<ExternalSecretsProvider[]> {
		return await this.find();
	}
}

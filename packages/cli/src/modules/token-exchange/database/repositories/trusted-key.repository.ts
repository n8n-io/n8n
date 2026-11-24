import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { TrustedKeyEntity } from '../entities/trusted-key.entity';

@Service()
export class TrustedKeyRepository extends Repository<TrustedKeyEntity> {
	constructor(dataSource: DataSource) {
		super(TrustedKeyEntity, dataSource.manager);
	}

	async findBySourceAndKid(sourceId: string, kid: string): Promise<TrustedKeyEntity | null> {
		return await this.findOneBy({ sourceId, kid });
	}

	async findAllByKid(kid: string): Promise<TrustedKeyEntity[]> {
		return await this.findBy({ kid });
	}
}

import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { TrustedKeySourceEntity } from '../entities/trusted-key-source.entity';

@Service()
export class TrustedKeySourceRepository extends Repository<TrustedKeySourceEntity> {
	constructor(dataSource: DataSource) {
		super(TrustedKeySourceEntity, dataSource.manager);
	}
}

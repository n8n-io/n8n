import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DynamicCredentialUserEntry } from '../entities/dynamic-credential-user-entry';

@Service()
export class DynamicCredentialUserEntryRepository extends Repository<DynamicCredentialUserEntry> {
	constructor(dataSource: DataSource) {
		super(DynamicCredentialUserEntry, dataSource.manager);
	}
}

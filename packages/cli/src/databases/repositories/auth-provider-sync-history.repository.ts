import { AuthProviderSyncHistory } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class AuthProviderSyncHistoryRepository extends Repository<AuthProviderSyncHistory> {
	constructor(dataSource: DataSource) {
		super(AuthProviderSyncHistory, dataSource.manager);
	}
}

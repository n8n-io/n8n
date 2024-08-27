import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { AuthProviderSyncHistory } from '../entities/auth-provider-sync-history';

@Service()
export class AuthProviderSyncHistoryRepository extends Repository<AuthProviderSyncHistory> {
	constructor(dataSource: DataSource) {
		super(AuthProviderSyncHistory, dataSource.manager);
	}
}

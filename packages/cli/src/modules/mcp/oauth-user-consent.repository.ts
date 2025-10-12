import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { UserConsent } from '@n8n/db';

@Service()
export class UserConsentRepository extends Repository<UserConsent> {
	constructor(dataSource: DataSource) {
		super(UserConsent, dataSource.manager);
	}
}

import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WebauthnCredential } from '../entities';

@Service()
export class WebauthnCredentialRepository extends Repository<WebauthnCredential> {
	constructor(dataSource: DataSource) {
		super(WebauthnCredential, dataSource.manager);
	}
}

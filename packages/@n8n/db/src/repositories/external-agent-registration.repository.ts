import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ExternalAgentRegistration } from '../entities/external-agent-registration';

@Service()
export class ExternalAgentRegistrationRepository extends Repository<ExternalAgentRegistration> {
	constructor(dataSource: DataSource) {
		super(ExternalAgentRegistration, dataSource.manager);
	}
}

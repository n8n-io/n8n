import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceCredentialAssignment } from '../entities';

@Service()
export class InstanceCredentialAssignmentRepository extends Repository<InstanceCredentialAssignment> {
	constructor(dataSource: DataSource) {
		super(InstanceCredentialAssignment, dataSource.manager);
	}
}

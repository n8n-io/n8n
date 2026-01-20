import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublicationOutbox } from '../entities';

@Service()
export class WorkflowPublicationOutboxRepository extends Repository<WorkflowPublicationOutbox> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublicationOutbox, dataSource.manager);
	}
}

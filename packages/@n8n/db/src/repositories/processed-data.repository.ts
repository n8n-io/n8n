import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProcessedData } from '../entities';

@Service()
export class ProcessedDataRepository extends Repository<ProcessedData> {
	constructor(dataSource: DataSource) {
		super(ProcessedData, dataSource.manager);
	}

	/** Deletes the deduplication records of a workflow, in every context. */
	async deleteForWorkflow(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}
}

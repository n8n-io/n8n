import { BaseRepository, Project, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

/** The project queries of the SCIM deprovisioning policy. */
@Service()
export class ScimTransferTargetRepository extends BaseRepository<Project> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Project, dataSource.manager, transactionRunner);
	}

	/**
	 * The project and its creator. For a personal project, the creator is the
	 * user of the project.
	 */
	async findWithCreator(projectId: string, ctx: OperationContext): Promise<Project | null> {
		return await this.managerFor(ctx).findOne(Project, {
			where: { id: projectId },
			relations: { creator: true },
		});
	}
}

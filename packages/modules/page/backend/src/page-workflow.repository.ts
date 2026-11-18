import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	OperationContext,
	TransactionRunner,
	WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

class WorkflowTable extends BaseRepository<WorkflowEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowEntity, dataSource.manager, transactionRunner);
	}
}

export type WorkflowNodesRow = Pick<WorkflowEntity, 'id' | 'name' | 'nodes'>;

/** Reads the workflow table. The page module never writes to it. */
@Service()
export class PageWorkflowRepository {
	private readonly table: WorkflowTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowTable(dataSource, transactionRunner);
	}

	/**
	 * Lists the workflows that are not archived and whose stored nodes contain the text, by name.
	 * The match is on the serialized nodes, so it can be in any field of any node.
	 * The query reads every workflow row, because no index covers the nodes.
	 */
	async findActiveWithNodesContaining(
		text: string,
		ctx: OperationContext,
	): Promise<WorkflowNodesRow[]> {
		return await this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.select(['workflow.id', 'workflow.name', 'workflow.nodes'])
			.where('workflow.isArchived = :isArchived', { isArchived: false })
			.andWhere(`CAST(workflow.nodes AS text) LIKE :nodesPattern ${LIKE_ESCAPE_CLAUSE}`, {
				nodesPattern: `%${escapeLike(text)}%`,
			})
			.orderBy('workflow.name', 'ASC')
			.addOrderBy('workflow.id', 'ASC')
			.getMany();
	}
}

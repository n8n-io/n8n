import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	OperationContext,
	TransactionRunner,
	WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type SelectQueryBuilder } from '@n8n/typeorm';

class WorkflowTable extends BaseRepository<WorkflowEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowEntity, dataSource.manager, transactionRunner);
	}
}

export type WorkflowNodesRow = Pick<WorkflowEntity, 'id' | 'name' | 'nodes'>;

/** A workflow with its nodes and its project. `active` is true when a version of the workflow is published. */
export type ProjectWorkflowRow = WorkflowNodesRow & {
	projectId: string;
	projectName: string;
	active: boolean;
	updatedAt: Date;
};

const WORKFLOW_OWNER_ROLE = 'workflow:owner';

/** Reads a workflow that was loaded with the one project that owns it. */
function toProjectWorkflowRow(workflow: WorkflowEntity): ProjectWorkflowRow {
	const [{ project }] = workflow.shared;
	return {
		id: workflow.id,
		name: workflow.name,
		nodes: workflow.nodes,
		projectId: project.id,
		projectName: project.name,
		active: workflow.activeVersionId !== null,
		updatedAt: workflow.updatedAt,
	};
}

/** Keeps the workflows of these projects. No project keeps no workflow, because `IN ()` is not valid SQL. */
function restrictToProjects(
	query: SelectQueryBuilder<WorkflowEntity>,
	projectIds: string[],
): SelectQueryBuilder<WorkflowEntity> {
	return projectIds.length > 0
		? query.andWhere('shared.projectId IN (:...projectIds)', { projectIds })
		: query.andWhere('1 = 0');
}

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

	/**
	 * Lists the workflows that are not archived, with the project that owns each of them, by name.
	 * `projectIds` restricts the result to the workflows of these projects. `null` means every project.
	 */
	async listNotArchivedOfProjects(
		projectIds: string[] | null,
		ctx: OperationContext,
	): Promise<ProjectWorkflowRow[]> {
		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.select([
				'workflow.id',
				'workflow.name',
				'workflow.nodes',
				'workflow.activeVersionId',
				'workflow.updatedAt',
				'shared.workflowId',
				'shared.projectId',
				'project.id',
				'project.name',
			])
			.innerJoin('workflow.shared', 'shared', 'shared.role = :role', { role: WORKFLOW_OWNER_ROLE })
			.innerJoin('shared.project', 'project')
			.where('workflow.isArchived = :isArchived', { isArchived: false })
			.orderBy('workflow.name', 'ASC')
			.addOrderBy('workflow.id', 'ASC');
		const workflows = await (projectIds === null
			? query
			: restrictToProjects(query, projectIds)
		).getMany();
		return workflows.map(toProjectWorkflowRow);
	}
}

import type { INode } from 'n8n-workflow';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { MigrationContext, ReversibleMigration } from '@db/types';
import { v4 as uuid } from 'uuid';

type Workflow = Pick<WorkflowEntity, 'id'> & { nodes: string | INode[] };

export class AddNodeIds1658930531669 implements ReversibleMigration {
	async up({ escape, executeQuery, runInBatches }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const workflowsQuery = `SELECT id, nodes FROM ${tableName}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = this.parseNodes(workflow.nodes);
				nodes.forEach((node: INode) => {
					if (!node.id) {
						node.id = uuid();
					}
				});

				await executeQuery(
					`UPDATE ${tableName} SET nodes = :nodes WHERE id = :id`,
					{ nodes: JSON.stringify(nodes) },
					{ id: workflow.id },
				);
			});
		});
	}

	async down({ escape, executeQuery, runInBatches }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const workflowsQuery = `SELECT id, nodes FROM ${tableName}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = this.parseNodes(workflow.nodes).map(({ id, ...rest }) => rest);
				await executeQuery(
					`UPDATE ${tableName} SET nodes = :nodes WHERE id = :id`,
					{ nodes: JSON.stringify(nodes) },
					{ id: workflow.id },
				);
			});
		});
	}

	private parseNodes(nodes: INode[] | string): INode[] {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, n8n-local-rules/no-uncaught-json-parse
		return typeof nodes === 'string' ? JSON.parse(nodes) : nodes;
	}
}

import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { WorkflowEntity } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

type Workflow = Pick<WorkflowEntity, 'id'> & { nodes: string | INode[] };

export class AddNodeIds1658930531669 implements ReversibleMigration {
	async up({ escape, runQuery, runInBatches, parseJson }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const workflowsQuery = `SELECT id, nodes FROM ${tableName}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = parseJson(workflow.nodes);
				nodes.forEach((node: INode) => {
					if (!node.id) {
						node.id = uuid();
					}
				});

				await runQuery(`UPDATE ${tableName} SET nodes = :nodes WHERE id = :id`, {
					nodes: JSON.stringify(nodes),
					id: workflow.id,
				});
			});
		});
	}

	async down({ escape, runQuery, runInBatches, parseJson }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const workflowsQuery = `SELECT id, nodes FROM ${tableName}`;
		await runInBatches<Workflow>(workflowsQuery, async (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = parseJson(workflow.nodes).map(({ id, ...rest }) => rest);
				await runQuery(`UPDATE ${tableName} SET nodes = :nodes WHERE id = :id`, {
					nodes: JSON.stringify(nodes),
					id: workflow.id,
				});
			});
		});
	}
}

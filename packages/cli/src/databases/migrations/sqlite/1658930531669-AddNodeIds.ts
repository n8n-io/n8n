/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { INode } from 'n8n-workflow';
import type { MigrationContext, ReversibleMigration } from '@db/types';
import { runInBatches } from '@db/utils/migrationHelpers';
import { v4 as uuid } from 'uuid';

// add node ids in workflow objects

export class AddNodeIds1658930531669 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
				nodes.forEach((node: INode) => {
					if (!node.id) {
						node.id = uuid();
					}
				});

				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
							UPDATE "${tablePrefix}workflow_entity"
							SET nodes = :nodes
							WHERE id = '${workflow.id}'
						`,
					{ nodes: JSON.stringify(nodes) },
					{},
				);

				await queryRunner.query(updateQuery, updateParams);
			});
		});
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runInBatches(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
				// @ts-ignore
				nodes.forEach((node) => delete node.id);

				const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
					`
							UPDATE "${tablePrefix}workflow_entity"
							SET nodes = :nodes
							WHERE id = '${workflow.id}'
						`,
					{ nodes: JSON.stringify(nodes) },
					{},
				);

				await queryRunner.query(updateQuery, updateParams);
			});
		});
	}
}

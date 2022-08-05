import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { runChunked } from '../../utils/migrationHelpers';
import { v4 as uuid } from 'uuid';

// add node ids in workflow objects

export class AddNodeIds1658932910559 implements MigrationInterface {
	name = 'AddNodeIds1658932910559';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		const workflowsQuery = `
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`;

		// @ts-ignore
		await runChunked(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				let nodes = workflow.nodes;
				if (typeof nodes === 'string') {
					nodes = JSON.parse(nodes);
				}

				// @ts-ignore
				nodes.forEach((node) => {
					if (!node.id) {
						node.id = uuid();
					}
				});

				const [updateQuery, updateParams] =
					queryRunner.connection.driver.escapeQueryWithParameters(
						`
							UPDATE ${tablePrefix}workflow_entity
							SET nodes = :nodes
							WHERE id = '${workflow.id}'
						`,
						{ nodes: JSON.stringify(nodes) },
						{},
					);

				queryRunner.query(updateQuery, updateParams);
			});
		});
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		const workflowsQuery = `
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`;

		// @ts-ignore
		await runChunked(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = workflow.nodes;
				// @ts-ignore
				nodes.forEach((node) => delete node.id );

				const [updateQuery, updateParams] =
					queryRunner.connection.driver.escapeQueryWithParameters(
						`
							UPDATE ${tablePrefix}workflow_entity
							SET nodes = :nodes
							WHERE id = '${workflow.id}'
						`,
						{ nodes: JSON.stringify(nodes) },
						{},
					);

				queryRunner.query(updateQuery, updateParams);
			});
		});
	}
}

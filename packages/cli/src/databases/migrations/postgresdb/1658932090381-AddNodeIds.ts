import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { runChunked } from '../../utils/migrationHelpers';
import { v4 as uuid } from 'uuid';

// add node ids in workflow objects

export class AddNodeIds1658932090381 implements MigrationInterface {
	name = 'AddNodeIds1658932090381';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		const workflowsQuery = `
			SELECT id, nodes
			FROM ${tablePrefix}workflow_entity
		`;

		// @ts-ignore
		await runChunked(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = workflow.nodes;
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
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

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

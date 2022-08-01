import { INode } from 'n8n-workflow';
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';
import { runChunked } from '../../utils/migrationHelpers';
import { v4 as uuid } from 'uuid';

// add node ids in workflow objects

export class AddNodeIds1658930531669 implements MigrationInterface {
	name = 'AddNodeIds1658930531669';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runChunked(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
				nodes.forEach((node: INode) => {
					if (!node.id) {
						node.id = uuid();
					}
				});

				const [updateQuery, updateParams] =
					queryRunner.connection.driver.escapeQueryWithParameters(
						`
							UPDATE "${tablePrefix}workflow_entity"
							SET nodes = :nodes
							WHERE id = '${workflow.id}'
						`,
						{ nodes: JSON.stringify(nodes) },
						{},
					);

				queryRunner.query(updateQuery, updateParams);
			});
		});

		logMigrationEnd(this.name);
	}


	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		// @ts-ignore
		await runChunked(queryRunner, workflowsQuery, (workflows) => {
			workflows.forEach(async (workflow) => {
				const nodes = JSON.parse(workflow.nodes);
				// @ts-ignore
				nodes.forEach((node) => delete node.id );

				const [updateQuery, updateParams] =
					queryRunner.connection.driver.escapeQueryWithParameters(
						`
							UPDATE "${tablePrefix}workflow_entity"
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

import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';
import { INode } from 'n8n-workflow';

export class AddTriggerCountColumn1669823906993 implements MigrationInterface {
	name = 'AddTriggerCountColumn1669823906993';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "triggerCount" integer NOT NULL DEFAULT 0`,
		);

		const workflowsQuery = `
			SELECT id, nodes
			FROM "${tablePrefix}workflow_entity"
		`;

		const workflows: Array<{ id: number; nodes: string }> = await queryRunner.query(workflowsQuery);

		const updatePromises = workflows.map(async (workflow) => {
			const nodes = JSON.parse(workflow.nodes);
			const triggerCount = nodes.filter(
				(node: INode) =>
					node.type.endsWith('trigger') && node.type !== 'n8n-nodes-base.manualTrigger',
			).length;
			const query = `UPDATE "${tablePrefix}workflow_entity" SET triggerCount = ${triggerCount} WHERE id = ${workflow.id}`;
			return queryRunner.query(query);
		});

		await Promise.all(updatePromises);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "triggerCount"`,
		);
	}
}

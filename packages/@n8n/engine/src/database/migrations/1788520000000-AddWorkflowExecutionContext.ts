import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';

export class AddWorkflowExecutionContext1788520000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: 'context',
				type: 'jsonb',
				default: "'{}'",
				comment:
					'Caller facts the host supplies at start (user, project, host mode). Stored without inspection and handed to step executors.',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn(TABLE, 'context');
	}
}

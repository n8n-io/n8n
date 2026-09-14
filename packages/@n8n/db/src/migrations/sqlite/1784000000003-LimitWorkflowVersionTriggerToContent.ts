import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Re-creates the `workflow_version_increment` trigger so `versionCounter`
 * is bumped only when indexable content (`nodes` or `settings`) changes.
 *
 * @timestamp 2026-07-14 03:33:20 UTC + 3ms — sits one slot above the current
 * floor (`1784000000000`) to satisfy the code-health ordering rule.
 */
export class LimitWorkflowVersionTriggerToContent1784000000003 implements ReversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const incrementTrigger = escape.triggerName('workflow_version_increment');
		const versionCounter = escape.columnName('versionCounter');
		const nodes = escape.columnName('nodes');
		const settings = escape.columnName('settings');
		const id = escape.columnName('id');

		await queryRunner.query(`DROP TRIGGER IF EXISTS ${incrementTrigger}`);
		await queryRunner.query(`
			CREATE TRIGGER ${incrementTrigger}
			AFTER UPDATE ON ${workflowEntity}
			FOR EACH ROW
			WHEN OLD.${versionCounter} = NEW.${versionCounter}
				AND (OLD.${nodes} IS NOT NEW.${nodes} OR OLD.${settings} IS NOT NEW.${settings})
			BEGIN
				UPDATE ${workflowEntity}
				SET ${versionCounter} = ${versionCounter} + 1
				WHERE ${id} = NEW.${id};
			END;
		`);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const incrementTrigger = escape.triggerName('workflow_version_increment');
		const versionCounter = escape.columnName('versionCounter');
		const id = escape.columnName('id');

		await queryRunner.query(`DROP TRIGGER IF EXISTS ${incrementTrigger}`);
		await queryRunner.query(`
			CREATE TRIGGER ${incrementTrigger}
			AFTER UPDATE ON ${workflowEntity}
			FOR EACH ROW
			WHEN OLD.${versionCounter} = NEW.${versionCounter}
			BEGIN
				UPDATE ${workflowEntity}
				SET ${versionCounter} = ${versionCounter} + 1
				WHERE ${id} = NEW.${id};
			END;
		`);
	}
}

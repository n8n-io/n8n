import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Re-creates the `workflow_version_increment` trigger so `versionCounter`
 * is bumped only when indexable content (`nodes` or `settings`) changes.
 *
 * @timestamp 2026-07-25 17:20:00 UTC (intentionally in future as of
 * migration creation date due to preceding timestamps)
 */
export class LimitWorkflowVersionTriggerToContent1785000000000 implements ReversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const incrementFunction = escape.functionName('increment_workflow_version');
		const versionCounter = escape.columnName('versionCounter');
		const nodes = escape.columnName('nodes');
		const settings = escape.columnName('settings');

		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION ${incrementFunction}()
			RETURNS TRIGGER AS $$
			BEGIN
				IF NEW.${versionCounter} IS NOT DISTINCT FROM OLD.${versionCounter}
					AND (NEW.${nodes}::text IS DISTINCT FROM OLD.${nodes}::text
						OR NEW.${settings}::text IS DISTINCT FROM OLD.${settings}::text) THEN
					NEW.${versionCounter} = OLD.${versionCounter} + 1;
				END IF;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		const incrementFunction = escape.functionName('increment_workflow_version');
		const versionCounter = escape.columnName('versionCounter');

		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION ${incrementFunction}()
			RETURNS TRIGGER AS $$
			BEGIN
				IF NEW.${versionCounter} IS NOT DISTINCT FROM OLD.${versionCounter} THEN
					NEW.${versionCounter} = OLD.${versionCounter} + 1;
				END IF;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
	}
}

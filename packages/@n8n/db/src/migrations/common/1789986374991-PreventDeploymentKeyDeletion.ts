import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class PreventDeploymentKeyDeletion1789986374991 implements ReversibleMigration {
	async up({ isSqlite, escape, runQuery }: MigrationContext) {
		const table = escape.tableName('deployment_key');
		const deleteTrigger = escape.triggerName('prevent_deployment_key_delete');

		if (isSqlite) {
			await runQuery(`
				CREATE TRIGGER ${deleteTrigger}
				BEFORE DELETE ON ${table}
				BEGIN
					SELECT RAISE(ABORT, 'Deployment keys must not be deleted');
				END
			`);
			return;
		}

		const truncateTrigger = escape.triggerName('prevent_deployment_key_truncate');
		const triggerFunction = escape.functionName('prevent_deployment_key_delete');
		await runQuery(`
			CREATE FUNCTION ${triggerFunction}()
			RETURNS trigger
			LANGUAGE plpgsql
			AS $$
			BEGIN
				RAISE EXCEPTION 'Deployment keys must not be deleted';
			END;
			$$
		`);
		await runQuery(`
			CREATE TRIGGER ${deleteTrigger}
			BEFORE DELETE ON ${table}
			FOR EACH STATEMENT
			EXECUTE FUNCTION ${triggerFunction}()
		`);
		await runQuery(`
			CREATE TRIGGER ${truncateTrigger}
			BEFORE TRUNCATE ON ${table}
			FOR EACH STATEMENT
			EXECUTE FUNCTION ${triggerFunction}()
		`);
	}

	async down({ isSqlite, escape, runQuery }: MigrationContext) {
		const deleteTrigger = escape.triggerName('prevent_deployment_key_delete');
		if (isSqlite) {
			await runQuery(`DROP TRIGGER IF EXISTS ${deleteTrigger}`);
			return;
		}

		const table = escape.tableName('deployment_key');
		const truncateTrigger = escape.triggerName('prevent_deployment_key_truncate');
		const triggerFunction = escape.functionName('prevent_deployment_key_delete');
		await runQuery(`DROP TRIGGER IF EXISTS ${deleteTrigger} ON ${table}`);
		await runQuery(`DROP TRIGGER IF EXISTS ${truncateTrigger} ON ${table}`);
		await runQuery(`DROP FUNCTION IF EXISTS ${triggerFunction}()`);
	}
}

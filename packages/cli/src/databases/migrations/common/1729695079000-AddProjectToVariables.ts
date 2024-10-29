import { ApplicationError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddProjectToVariables1729695079000 implements ReversibleMigration {
	async up({
		dbType,
		// escape,
		// runQuery,
		schemaBuilder: { addColumns, column, addForeignKey, dropIndex },
		tablePrefix,
	}: MigrationContext) {
		await addColumns('variables', [column('projectId').varchar(36)]);
		await addForeignKey('variables', 'projectId', ['project', 'id']);
		// TODO test this
		if (dbType === 'sqlite') {
			await dropIndex('variables', ['key'], { customIndexName: `idx_${tablePrefix}variables_key` });
		} else if (dbType === 'postgresdb') {
			// await runQuery(`ALTER TABLE ${escape.tableName('variables')} DROP CONSTRAINT `);
			await dropIndex('variables', ['key']);
		} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
			await dropIndex('variables', ['key'], { customIndexName: 'key' });
		}
	}

	async down({
		escape,
		logger,
		runQuery,
		schemaBuilder: { createIndex, dropColumns },
	}: MigrationContext) {
		const [{ count: projectVariables }] = await runQuery<[{ count: number }]>(
			`SELECT COUNT(*) FROM ${escape.tableName('variables')} WHERE projectId IS NOT NuLL`,
		);

		if (projectVariables > 0) {
			const message =
				'Down migration only possible when there are no project variables. Please delete all project variable that were created via the UI first.';
			logger.error(message);
			throw new ApplicationError(message);
		}

		await dropColumns('variables', ['projectId']);

		// TODO finish adding back previous constraints
		// make sure they're the same name so that the up
		// migration doesn't fail next time
		let indexName: string | undefined = undefined;
		await createIndex('variables', ['key'], true);
	}
}

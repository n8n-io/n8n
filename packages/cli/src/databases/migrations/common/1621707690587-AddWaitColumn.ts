import type { MigrationContext, ReversibleMigration } from '@db/types';

const indexName = 'ca4a71b47f28ac6ea88293a8e2';

export class AddWaitColumn1621707690587 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('execution_entity', [column('waitTill').timestamp()]);
		await createIndex('execution_entity', ['waitTill'], false, indexName);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('execution_entity', ['waitTill'], indexName);
		await dropColumns('execution_entity', ['waitTill']);
	}
}

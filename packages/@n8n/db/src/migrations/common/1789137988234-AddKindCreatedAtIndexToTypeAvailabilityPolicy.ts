import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'type_availability_policy';
const columns = ['kind', 'createdAt', 'id'];

/**
 * Supports the public API's policy document list: `WHERE kind ORDER BY createdAt, id`. Without
 * this index, that query scans the whole table.
 */
export class AddKindCreatedAtIndexToTypeAvailabilityPolicy1789137988234
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		await context.schemaBuilder.createIndex(tableName, columns);
	}

	async down(context: MigrationContext) {
		await context.schemaBuilder.dropIndex(tableName, columns, { skipIfMissing: true });
	}
}

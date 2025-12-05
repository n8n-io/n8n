import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialsTableName = 'credentials_entity';
const resolverTableName = 'dynamic_credential_resolver';
const FOREIGN_KEY_NAME = 'credentials_entity_resolverId_foreign';

export class AddResolvableFieldsToCredentials1764689448000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		// Add isResolvable, resolvableAllowFallback, and resolverId columns to credentials_entity
		await addColumns(credentialsTableName, [
			column('isResolvable').bool.notNull.default(false),
			column('resolvableAllowFallback').bool.notNull.default(false),
			column('resolverId').varchar(16),
		]);

		// Add foreign key constraint
		await addForeignKey(
			credentialsTableName,
			'resolverId',
			[resolverTableName, 'id'],
			FOREIGN_KEY_NAME,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		// Drop foreign key constraint
		await dropForeignKey(
			credentialsTableName,
			'resolverId',
			[resolverTableName, 'id'],
			FOREIGN_KEY_NAME,
		);

		// Drop columns from credentials_entity
		await dropColumns(credentialsTableName, [
			'isResolvable',
			'resolvableAllowFallback',
			'resolverId',
		]);
	}
}

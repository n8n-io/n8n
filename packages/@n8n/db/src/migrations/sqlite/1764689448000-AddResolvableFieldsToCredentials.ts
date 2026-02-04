import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialsTableName = 'credentials_entity';
const resolverTableName = 'dynamic_credential_resolver';
const FOREIGN_KEY_NAME = 'credentials_entity_resolverId_foreign';

export class AddResolvableFieldsToCredentials1764689448000 implements ReversibleMigration {
	transaction = false as const;

	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(credentialsTableName, [
			column('isResolvable').bool.notNull.default(false),
			column('resolvableAllowFallback').bool.notNull.default(false),
			column('resolverId').varchar(16),
		]);

		await addForeignKey(
			credentialsTableName,
			'resolverId',
			[resolverTableName, 'id'],
			FOREIGN_KEY_NAME,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(credentialsTableName, [
			'isResolvable',
			'resolvableAllowFallback',
			'resolverId',
		]);
	}
}

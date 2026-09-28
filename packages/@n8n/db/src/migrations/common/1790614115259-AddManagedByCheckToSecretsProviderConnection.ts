import type { MigrationContext, ReversibleMigration } from '../migration-types';

const MANAGED_BY_VALUES = ['api', 'config-file'];

/**
 * Constrains `managedBy` to exactly the two values the application code treats as valid.
 * The column was added loose (plain VARCHAR, default 'api') by an earlier migration, so
 * every pre-existing row already satisfies this CHECK.
 */
export class AddManagedByCheckToSecretsProviderConnection1790614115259
	implements ReversibleMigration
{
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.addEnumCheck(
			'secrets_provider_connection',
			'managedBy',
			MANAGED_BY_VALUES,
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck('secrets_provider_connection', 'managedBy', {
			recreatesOnSqlite: true,
		});
	}
}

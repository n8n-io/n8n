import { AddManagedByCheckToSecretsProviderConnection1790614115259 as BaseMigration } from '../common/1790614115259-AddManagedByCheckToSecretsProviderConnection';

/**
 * Swapping the `managedBy` CHECK recreates the whole `secrets_provider_connection` table on
 * SQLite. `project_secrets_provider_access` references it with ON DELETE CASCADE, so the
 * recreate's DROP would cascade and wipe project-scoping rows — same risk documented on
 * `AddCoalesceOwnerMisfirePolicy`'s SQLite subclass.
 */
export class AddManagedByCheckToSecretsProviderConnection1790614115259 extends BaseMigration {
	withFKsDisabled = true as const;
}

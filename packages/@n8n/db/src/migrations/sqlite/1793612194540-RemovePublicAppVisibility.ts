import { RemovePublicAppVisibility1793612194540 as BaseMigration } from '../common/1793612194540-RemovePublicAppVisibility';

/**
 * SQLite variant: changing the `visibility` CHECK recreates the `app` table, and
 * `app_version` references it with CASCADE, so foreign keys stay off.
 */
export class RemovePublicAppVisibility1793612194540 extends BaseMigration {
	withFKsDisabled = true as const;
}

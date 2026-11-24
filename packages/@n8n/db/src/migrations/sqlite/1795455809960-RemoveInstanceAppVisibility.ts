import { RemoveInstanceAppVisibility1795455809960 as BaseMigration } from '../common/1795455809960-RemoveInstanceAppVisibility';

/**
 * SQLite variant: changing the `visibility` CHECK recreates the `app` table, and
 * `app_version` references it with CASCADE, so foreign keys stay off.
 */
export class RemoveInstanceAppVisibility1795455809960 extends BaseMigration {
	withFKsDisabled = true as const;
}

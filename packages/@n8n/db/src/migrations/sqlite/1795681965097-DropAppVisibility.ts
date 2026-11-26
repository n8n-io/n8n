import { DropAppVisibility1795681965097 as BaseMigration } from '../common/1795681965097-DropAppVisibility';

/**
 * SQLite variant: dropping a column recreates the `app` table, and `app_version`
 * references it with CASCADE, so foreign keys stay off.
 */
export class DropAppVisibility1795681965097 extends BaseMigration {
	withFKsDisabled = true as const;
}

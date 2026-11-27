import { DropAppVisibility1795794866213 as BaseMigration } from '../common/1795794866213-DropAppVisibility';

/**
 * SQLite variant: dropping a column recreates the `app` table, and `app_version`
 * references it with CASCADE, so foreign keys stay off.
 */
export class DropAppVisibility1795794866213 extends BaseMigration {
	withFKsDisabled = true as const;
}

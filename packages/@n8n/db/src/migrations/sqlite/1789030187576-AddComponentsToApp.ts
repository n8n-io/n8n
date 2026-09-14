import { AddComponentsToApp1789030187576 as BaseMigration } from '../common/1789030187576-AddComponentsToApp';

/**
 * `app` has incoming FKs (`page.appId`, `app_version.appId`) with CASCADE;
 * adding a column recreates the `app` table on SQLite, which would otherwise
 * cascade-delete those rows when the original table is dropped.
 */
export class AddComponentsToApp1789030187576 extends BaseMigration {
	withFKsDisabled = true as const;
}

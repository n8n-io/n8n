import { AddAuthToApp1788953408255 as BaseMigration } from '../common/1788953408255-AddAuthToApp';

/**
 * `app` has incoming FKs (`page.appId`, `app_version.appId`) with CASCADE;
 * adding a column recreates the `app` table on SQLite, which would otherwise
 * cascade-delete those rows when the original table is dropped.
 */
export class AddAuthToApp1788953408255 extends BaseMigration {
	withFKsDisabled = true as const;
}

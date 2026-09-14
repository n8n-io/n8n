import { CreateAppVersionTable1788870173613 as BaseMigration } from '../common/1788870173613-CreateAppVersionTable';

/**
 * `app` has incoming FKs (`page.appId`, `app_version.appId`) with CASCADE;
 * adding `activeVersionId` recreates the `app` table on SQLite, which would
 * otherwise cascade-delete those rows when the original table is dropped.
 */
export class CreateAppVersionTable1788870173613 extends BaseMigration {
	withFKsDisabled = true as const;
}

import { AddLayoutToPage1788965411418 as BaseMigration } from '../common/1788965411418-AddLayoutToPage';

/**
 * `page` references itself (`parentPageId`) with CASCADE; adding a column
 * recreates the table on SQLite, which would otherwise cascade-delete every
 * child page when the original table is dropped.
 */
export class AddLayoutToPage1788965411418 extends BaseMigration {
	withFKsDisabled = true as const;
}

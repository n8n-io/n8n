import { AddTitleToPage1789042652437 as BaseMigration } from '../common/1789042652437-AddTitleToPage';

/**
 * `page` has an incoming FK (`page.parentPageId` → `page.id`) with CASCADE;
 * adding a column recreates the table on SQLite, which would otherwise
 * cascade-delete the child pages when the original table is dropped.
 */
export class AddTitleToPage1789042652437 extends BaseMigration {
	withFKsDisabled = true as const;
}

import { RemoveDataWorkflowIdFromPage1788870185907 as BaseMigration } from '../common/1788870185907-RemoveDataWorkflowIdFromPage';

/**
 * `page` has an incoming self-referencing FK (`parentPageId`, CASCADE);
 * dropping a column recreates the table on SQLite, which would otherwise
 * cascade-delete child pages when the original table is dropped.
 */
export class RemoveDataWorkflowIdFromPage1788870185907 extends BaseMigration {
	withFKsDisabled = true as const;
}

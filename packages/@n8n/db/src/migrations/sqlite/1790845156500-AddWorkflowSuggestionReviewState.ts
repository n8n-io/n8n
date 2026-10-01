import { AddWorkflowSuggestionReviewState1790845156500 as BaseMigration } from '../common/1790845156500-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1790845156500 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

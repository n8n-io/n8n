import { AddWorkflowSuggestionReviewState1790950059734 as BaseMigration } from '../common/1790950059734-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1790950059734 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

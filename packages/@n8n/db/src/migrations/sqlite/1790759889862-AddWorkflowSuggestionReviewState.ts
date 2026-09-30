import { AddWorkflowSuggestionReviewState1790759889862 as BaseMigration } from '../common/1790759889862-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1790759889862 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

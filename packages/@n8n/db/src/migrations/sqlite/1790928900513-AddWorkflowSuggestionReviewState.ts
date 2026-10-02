import { AddWorkflowSuggestionReviewState1790928900513 as BaseMigration } from '../common/1790928900513-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1790928900513 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

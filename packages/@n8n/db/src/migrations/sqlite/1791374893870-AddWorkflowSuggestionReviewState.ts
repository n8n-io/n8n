import { AddWorkflowSuggestionReviewState1791374893870 as BaseMigration } from '../common/1791374893870-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1791374893870 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

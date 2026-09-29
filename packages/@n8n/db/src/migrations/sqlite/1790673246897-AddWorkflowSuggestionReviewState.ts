import { AddWorkflowSuggestionReviewState1790673246897 as BaseMigration } from '../common/1790673246897-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1790673246897 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

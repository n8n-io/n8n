import { AddWorkflowSuggestionReviewState1791285202635 as BaseMigration } from '../common/1791285202635-AddWorkflowSuggestionReviewState';

export class AddWorkflowSuggestionReviewState1791285202635 extends BaseMigration {
	// Keep activity rows when SQLite recreates the referenced suggestion table.
	withFKsDisabled = true as const;
}

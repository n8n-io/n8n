export type DeterminismSuggestion = {
	draftWorkflowId: string;
	gainPoints: number;
	matchRate: number;
	holdoutRuns: number;
	tokenDelta: number | null;
};

export type DeterminismSummaryDto = {
	suggestion: DeterminismSuggestion | null;
};

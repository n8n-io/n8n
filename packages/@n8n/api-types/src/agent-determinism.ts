export type DeterminismSuggestion = {
	draftWorkflowId: string;
	gainPoints: number;
	matchRate: number;
	holdoutRuns: number;
	/** Share of the source's runs that the draft's group covers, 0..1. */
	trafficShare: number;
	tokenDelta: number | null;
};

export type DeterminismSummaryDto = {
	suggestion: DeterminismSuggestion | null;
	/** `running` while an analysis is in progress, so the UI can say so. */
	status: 'idle' | 'running' | 'failed' | null;
};

export type DeterminismSuggestionsDto = {
	suggestions: Record<string, DeterminismSuggestion>;
};

export interface AiErrorFix {
	sessionId: string;
	suggestionId: string;
}

export interface AiErrorExplanation {
	detailed: string;
	codeDiff?: string;
	fix?: AiErrorFix;
}

export interface AiErrorExplanationModalData {
	loadExplanation: (signal: AbortSignal) => Promise<AiErrorExplanation>;
	applyFix: (explanation: AiErrorExplanation) => Promise<void>;
}

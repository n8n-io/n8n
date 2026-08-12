export interface AiErrorExplanation {
	detailed: string;
	codeDiff?: string;
}

export interface AiErrorExplanationModalData {
	loadExplanation: (signal: AbortSignal) => Promise<AiErrorExplanation>;
}

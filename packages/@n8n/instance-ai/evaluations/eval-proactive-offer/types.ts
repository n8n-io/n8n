export interface EvalProactiveOfferCase {
	slug: string;
	prompt: string;
	expectsOffer: boolean;
}

export interface EvalProactiveOfferFinding {
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

export interface EvalProactiveOfferCaseResult {
	caseSlug: string;
	prompt: string;
	expectsOffer: boolean;
	offerDetected: boolean;
	workflowBuilt: boolean;
	workflowId?: string;
	findings: EvalProactiveOfferFinding[];
	passed: boolean;
	error?: string;
}

export interface EvalProactiveOfferRunResult {
	passed: boolean;
	results: EvalProactiveOfferCaseResult[];
}

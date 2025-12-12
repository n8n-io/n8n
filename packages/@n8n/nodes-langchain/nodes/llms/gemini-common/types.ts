/**
 * Options for Google Gemini/Vertex Chat Model nodes
 */
export interface GeminiModelOptions {
	maxOutputTokens?: number;
	temperature?: number;
	topK?: number;
	topP?: number;
	thinkingBudget?: number;
	useGoogleSearchGrounding?: boolean;
	dynamicRetrievalThreshold?: number;
}

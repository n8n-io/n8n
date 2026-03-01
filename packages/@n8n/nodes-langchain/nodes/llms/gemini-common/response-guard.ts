import { AIMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';

/**
 * Detects TypeError thrown by LangChain Google adapters when the Gemini API
 * returns a candidate with missing or malformed `content` structure.
 *
 * The @langchain/google-genai and @langchain/google-common packages destructure
 * `candidate.content` without verifying it exists. When the API returns a candidate
 * without a `content` field (e.g., due to safety filtering or empty responses),
 * accessing `.parts` on the undefined value throws:
 *   "Cannot read properties of undefined (reading 'parts')"
 *
 * This check is intentionally narrow to avoid masking unrelated TypeErrors.
 */
export function isMalformedLlmResponseError(error: unknown): boolean {
	if (!(error instanceof TypeError) || typeof error.message !== 'string') {
		return false;
	}

	const msg = error.message;
	return (
		msg.includes("reading 'parts'") ||
		msg.includes("reading 'role'") ||
		msg.includes("reading 'content'")
	);
}

/**
 * Creates a valid but empty ChatResult for use when the LLM returns a
 * malformed response. The agent will treat this as a final response with
 * no content and no tool calls, which is safe to process downstream.
 */
export function createEmptyChatResult(): ChatResult {
	return {
		generations: [
			{
				text: '',
				message: new AIMessage({
					content:
						'The model returned an empty response. This may be due to content filtering or a transient API issue.',
				}),
				generationInfo: {},
			},
		],
		llmOutput: {},
	};
}

/**
 * Extract workflow code from an LLM response.
 *
 * Looks for TypeScript/JavaScript code blocks (```typescript, ```ts, or ```)
 * and extracts the content. If no code block is found, returns the trimmed response.
 *
 * @param response - The LLM response that may contain code in a code block
 * @returns The extracted code, trimmed
 */
export function extractWorkflowCode(response: string): string {
	// Match ```typescript, ```ts, or ``` code blocks
	// Use non-greedy match to get first code block
	const codeBlockRegex = /```(?:typescript|ts)?\n([\s\S]*?)```/;
	const match = response.match(codeBlockRegex);

	if (match) {
		return match[1].trim();
	}

	// Fallback: return trimmed response if no code block found
	return response.trim();
}

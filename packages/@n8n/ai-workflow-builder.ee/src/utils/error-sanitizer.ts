/**
 * Sanitize error messages from LLM API calls to produce user-friendly output.
 * Detects HTML responses (e.g. Cloudflare WAF blocks) and replaces them
 * with clean messages based on the HTTP status code.
 */
export function sanitizeLlmErrorMessage(error: unknown): string {
	const statusCode = extractStatusCode(error);
	const rawMessage = error instanceof Error ? error.message : String(error);

	if (statusCode === 429 || containsHtml(rawMessage) || rawMessage.length > 500) {
		return buildUserFriendlyMessage(statusCode);
	}

	return rawMessage;
}

function containsHtml(message: string): boolean {
	return message.includes('<!DOCTYPE') || message.includes('<html') || message.includes('<HTML');
}

function extractStatusCode(error: unknown): number | undefined {
	if (
		error !== null &&
		typeof error === 'object' &&
		'status' in error &&
		typeof error.status === 'number'
	) {
		return error.status;
	}
	return undefined;
}

function buildUserFriendlyMessage(statusCode?: number): string {
	if (statusCode === 403) {
		return 'Your request was blocked by the API provider. This may be caused by content in the request that was flagged by the security filter. Please try rephrasing your request.';
	}
	if (statusCode === 429) {
		return 'Rate limit exceeded. Please wait a moment and try again.';
	}
	if (statusCode === 502 || statusCode === 503) {
		return 'The AI service is temporarily unavailable. Please try again in a moment.';
	}
	if (statusCode !== undefined && statusCode >= 500) {
		return 'The AI service encountered an internal error. Please try again.';
	}
	return 'An unexpected error occurred while communicating with the AI service. Please try again.';
}

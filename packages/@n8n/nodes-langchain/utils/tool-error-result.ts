import { isRecord } from '@n8n/utils/is-record';

/**
 * Detect whether a tool result represents an error.
 *
 * In direct mode, N8nTool catches errors and returns `e.toString()` producing
 * strings like `"NodeApiError: Bad request"`. ToolCode, ToolWorkflow and
 * ToolHttpRequest catch their own errors and return `"There was an error: \"...\""`;
 * ToolHttpRequest may prefix it with the status, `"HTTP 401 There was an error: \"...\""`.
 *
 * In queue mode, the job processor wraps errors as `{ error: { message, name } }`.
 */
export function isToolErrorResult(result: unknown): boolean {
	if (isRecord(result) && 'error' in result) {
		return isRecord(result.error) && typeof result.error.message === 'string';
	}
	if (typeof result === 'string') {
		return /^(\w+Error: |HTTP \d{3} There was an error: |There was an error: )/.test(result);
	}
	return false;
}

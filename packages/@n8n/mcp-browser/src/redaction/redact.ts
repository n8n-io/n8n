// ---------------------------------------------------------------------------
// Secret redactor for browser tool responses. Shared regex set + string/value
// helpers come from `@n8n/secret-patterns`; this module adds the MCP-specific
// `redactCallToolResult` wrapper that walks `CallToolResult` content blocks.
// ---------------------------------------------------------------------------

import { isPlainObject, redactString, redactValue } from '@n8n/secret-patterns';

import type { CallToolResult } from '../types';

export { redactString, redactValue };

/**
 * Redact a CallToolResult in-place: rewrites every `text` content block and
 * the `structuredContent` tree. `image` content blocks are left untouched
 * (regex on base64 PNG bytes is meaningless).
 */
export function redactCallToolResult(result: CallToolResult): CallToolResult {
	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = redactString(item.text);
		}
	}
	if (result.structuredContent !== undefined) {
		const redacted = redactValue(result.structuredContent);
		if (isPlainObject(redacted)) {
			result.structuredContent = redacted;
		}
	}
	return result;
}

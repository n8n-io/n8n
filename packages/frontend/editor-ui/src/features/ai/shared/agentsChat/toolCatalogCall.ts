import { TOOL_CATALOG_CALL_TOOL_NAME, unwrapToolCatalogCall } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Returns the tool and input that a tool catalog `call_tool` call runs, so the
 * chat shows the real tool. Returns other calls unchanged. The current
 * Assistant runtime unwraps these calls in its event reducer in the same way.
 */
export function resolveToolCatalogCall(
	toolName: string,
	input: unknown,
): { tool: string; input: unknown } {
	if (!isRecord(input)) return { tool: toolName, input };
	const call = unwrapToolCatalogCall(toolName, input);
	return call.toolName === toolName
		? { tool: toolName, input }
		: { tool: call.toolName, input: call.args };
}

/** The `tool` key first, as the call_tool schema orders it, with its complete value. */
const LEADING_TOOL_NAME = /^\s*\{\s*"tool"\s*:\s*"([\w.:-]+)"/;
/** Past this length, the start of the input will not name the tool any more. */
const MAX_TOOL_NAME_PREFIX_LENGTH = 256;

/**
 * Reads the tool that a call_tool call runs from the start of its streamed JSON
 * input, so the chat can name the tool before the full input arrives.
 * Returns `undefined` while the name is incomplete, and `null` when the input
 * does not start with it.
 */
export function readStreamedToolCatalogTarget(
	toolName: string,
	inputPrefix: string,
): string | null | undefined {
	if (toolName !== TOOL_CATALOG_CALL_TOOL_NAME) return null;
	const match = LEADING_TOOL_NAME.exec(inputPrefix);
	if (match) return match[1];
	return inputPrefix.length > MAX_TOOL_NAME_PREFIX_LENGTH ? null : undefined;
}

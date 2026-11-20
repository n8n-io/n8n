import { unwrapToolCatalogCall } from '@n8n/api-types';
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

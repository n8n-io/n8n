/**
 * Converts intermediateSteps messageLog entries from LangChain class instances
 * to plain objects. This ensures the data structure is consistent between
 * runtime (expression evaluation) and UI display (after JSON serialization).
 *
 * Without this, AIMessage instances have properties like `content` and
 * `tool_calls` directly, but their `toJSON()` wraps them under `kwargs`,
 * causing expressions built from UI inspection to fail at runtime.
 */
export function serializeIntermediateSteps(
	steps: Array<{ action: { messageLog?: unknown[] }; [key: string]: unknown }>,
): void {
	for (const step of steps) {
		if (step.action.messageLog) {
			step.action.messageLog = step.action.messageLog.map((msg) => {
				if (
					msg &&
					typeof msg === 'object' &&
					typeof (msg as Record<string, unknown>).toJSON === 'function'
				) {
					return serializeMessage(msg);
				}
				return msg;
			});
		}
	}
}

function serializeMessage(msg: unknown): Record<string, unknown> {
	const m = msg as Record<string, unknown>;
	const result: Record<string, unknown> = {};

	for (const key of Object.keys(m)) {
		if (key === 'toJSON' || key === '_getType') continue;
		result[key] = m[key];
	}

	// Ensure type is included (may come from a getter on the prototype)
	if (
		!('type' in result) &&
		typeof (m as Record<string, (...args: unknown[]) => unknown>)._getType === 'function'
	) {
		result.type = (m as Record<string, (...args: unknown[]) => unknown>)._getType();
	}

	return result;
}

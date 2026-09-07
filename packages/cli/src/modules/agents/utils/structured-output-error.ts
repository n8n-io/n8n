/**
 * Map a low-level agent execution error to a concise, actionable message when
 * the run requested structured output. Returns `null` when the error doesn't
 * look structured-output related, so the caller falls back to the generic
 * message.
 *
 * Structured output is enforced by the model provider, so failures surface as
 * an opaque parse/validation error (e.g. "No output generated") or a provider
 * 400. Provider-specific guidance (which models support it, the "all required"
 * rule) lives in the node's NDV notice — the runtime error stays short.
 */
export function describeStructuredOutputError(rawError: string): string | null {
	const haystack = rawError.toLowerCase();
	const signals = [
		'no object generated',
		'no output generated',
		'did not match schema',
		'could not parse the response',
		'response_format',
		'json_schema',
		'output_config',
		'additionalproperties',
		'invalid schema',
		'structured output',
		'does not support',
	];
	if (!signals.some((signal) => haystack.includes(signal))) return null;

	const message =
		"Couldn't get structured output matching the schema — the model may not support it.";

	// Only echo the raw provider error when it adds something beyond the AI SDK's
	// generic "no output generated / could not parse" wrapper — e.g. a provider
	// 400 that names the offending schema constraint. Otherwise it's just noise.
	const informativeSignals = [
		'additionalproperties',
		'response_format',
		'json_schema',
		'output_config',
		'invalid schema',
		'does not support',
		'required',
	];
	const hasUsefulDetail = informativeSignals.some((signal) => haystack.includes(signal));

	return hasUsefulDetail ? `${message} (${rawError})` : message;
}

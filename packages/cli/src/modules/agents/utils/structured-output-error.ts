/**
 * Map a low-level agent execution error to an actionable message when the run
 * requested structured output. Returns `null` when the error doesn't look
 * structured-output related, so the caller falls back to the generic message.
 *
 * Structured output is enforced by the model provider, so failures surface as
 * an opaque parse/validation error (e.g. "No output generated") or a provider
 * 400. This adds the context a workflow builder needs: not every model/provider
 * supports JSON Schema structured output, and strict providers require every
 * property to be listed in `required`.
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

	return (
		'The agent could not return structured output matching the provided schema. ' +
		'The selected model or provider may not support JSON Schema structured output, or the ' +
		'schema may be incompatible with it — some providers (e.g. OpenAI and xAI) require every ' +
		'property to be listed in "required", and some (e.g. DeepSeek) do not support structured ' +
		`output at all. Provider error: ${rawError}`
	);
}

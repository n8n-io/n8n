import type { IExecuteFunctions } from 'n8n-workflow';
import { accumulateTokenUsage } from 'n8n-workflow';

/**
 * Token usage as the image and responses endpoints report it. Upstream both types
 * declare these counts as required numbers, but an OpenAI-compatible proxy can answer
 * with a partial or malformed `usage` block, so they are treated as untrusted here.
 */
type ImageTokenUsage = {
	input_tokens?: number;
	output_tokens?: number;
};

/**
 * Accepts only what a token count can actually be: a non-negative integer. Nothing is
 * coerced, so `null`, `undefined`, numeric strings, `NaN` and the infinities are all
 * rejected — as are negative counts, which would otherwise *subtract* from the running
 * total, and fractional ones, which are not a possible number of tokens.
 */
const asTokenCount = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

/**
 * Reports token usage for an image operation, ignoring any count the API did not
 * actually return as a number.
 *
 * `accumulateTokenUsage` adds to the running total with `??`, which only guards against
 * `null`/`undefined`. Passing it a missing count would therefore store `NaN`, and since
 * `NaN` is not nullish every later accumulation in the same execution would stay `NaN`
 * too — leaving the whole run without usable token metrics (`NaN` also serializes to
 * `null`). Guarding at the call site keeps one malformed response from poisoning the
 * totals for every other node in the execution.
 */
export function accumulateImageTokenUsage(
	context: IExecuteFunctions,
	usage: ImageTokenUsage | undefined,
): void {
	if (!usage) return;

	const inputTokens = asTokenCount(usage.input_tokens);
	const outputTokens = asTokenCount(usage.output_tokens);

	// Nothing usable at all: report nothing rather than a confident zero, which is how
	// a response without a `usage` block already behaves.
	if (inputTokens === undefined && outputTokens === undefined) return;

	accumulateTokenUsage(context, inputTokens ?? 0, outputTokens ?? 0);
}

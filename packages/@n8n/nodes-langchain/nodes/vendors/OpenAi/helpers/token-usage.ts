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
 * `Number.isFinite` does not coerce, so `null`, `undefined`, numeric strings, `NaN` and
 * the infinities are all rejected and only a real, finite number is accepted.
 */
const asTokenCount = (value: unknown): number | undefined =>
	Number.isFinite(value) ? (value as number) : undefined;

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

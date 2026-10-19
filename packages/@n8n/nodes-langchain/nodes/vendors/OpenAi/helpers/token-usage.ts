import type { IExecuteFunctions } from 'n8n-workflow';
import { accumulateTokenUsage, asTokenCount } from 'n8n-workflow';

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
 * Reports token usage for an image operation, ignoring any count the API did not
 * actually return as a number.
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

/**
 * A tool call refused by a tool guardrail. The message is authored by the
 * runtime, not the tool, so it must reach the model plainly even for untrusted
 * tools — unlike tool-authored errors, which the untrusted-output protection
 * wraps.
 */
export class GuardrailStopError extends Error {
	constructor(
		readonly stage: 'before' | 'after',
		readonly code: string,
	) {
		super(
			stage === 'before'
				? `Tool call stopped by guardrail: ${code}`
				: `Tool result blocked by guardrail: ${code}`,
		);
		this.name = 'GuardrailStopError';
	}
}

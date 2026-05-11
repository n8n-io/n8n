/**
 * Per-agent sampling temperature.
 *
 * Set to 1 because Anthropic extended thinking requires temperature = 1.
 * Determinism for workflow SDK code emission is instead enforced by the
 * builder's grounded prompt, file-based submission flow, and validation tools.
 */
export const TEMPERATURE = {
	/** Workflow builder — emits strict workflow SDK TypeScript. */
	BUILDER: 1,
} as const;

/**
 * Per-agent sampling temperature.
 *
 * Lower values make the model more deterministic. Agents that emit
 * structured output (e.g. workflow SDK code) run colder so "creative"
 * token choices don't translate into broken artifacts.
 */
export const TEMPERATURE = {
	/** Workflow builder — emits strict workflow SDK TypeScript. */
	BUILDER: 0.2,
} as const;

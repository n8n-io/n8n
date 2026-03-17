import type { User } from '@n8n/db';

import type { RedactableExecution } from '@/executions/execution-redaction';

/**
 * Context passed to every redaction strategy by the orchestrator.
 * The orchestrator resolves `userCanReveal` once (single DB call) and shares
 * the result so individual strategies never need to perform permission checks.
 */
export interface RedactionContext {
	readonly user: User;
	readonly redactExecutionData: boolean | undefined;
	/** Pre-resolved by the orchestrator — true if the user can see unredacted data. */
	readonly userCanReveal: boolean;
}

/**
 * A composable unit of redaction logic.  Strategies are pure data transformers:
 * they mutate `execution` in place and own any side-effects they need to apply
 * (e.g. setting `execution.data.redactionInfo`).
 *
 * Strategies MUST NOT evaluate policy or check permissions — those decisions
 * are made by the orchestrator when building the pipeline.
 */
export interface IExecutionRedactionStrategy {
	readonly name: string;
	apply(execution: RedactableExecution, context: RedactionContext): Promise<void>;
}

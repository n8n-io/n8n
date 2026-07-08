// ---------------------------------------------------------------------------
// Pluggable artifact capture contract.
//
// Each artifact type (workflow, agent, config-eval, ...) implements this
// interface once: how to discover references to it in the transcript, how to
// fetch the full artifact, and how to render it for the judge prompt. The
// registry (./registry.ts) resolves a handler by ArtifactType.
//
// `FetchedArtifact` and `ArtifactVerdict` are intentionally NOT defined here —
// they have no consumer until the static (agent / config-eval) handlers and
// runner integration land in later steps.
// ---------------------------------------------------------------------------

import type { InstanceAiMessage } from '@n8n/api-types';

import type { BinaryCheck } from '../../binaryChecks/types';
import type { N8nClient } from '../../clients/n8n-client';
import type { ArtifactType } from '../../types';

/** A discovered-but-not-yet-fetched artifact reference. */
export interface ArtifactRef {
	type: ArtifactType;
	id: string;
	/** config-eval only: the workflow the eval config is attached to (reference/intent — never judged). */
	owningWorkflowId?: string;
}

/**
 * Signals available to a handler's discover(). Extend additively as new
 * artifact types need more signals (all current discovery reads from message
 * agentTrees).
 */
export interface DiscoverContext {
	messages: InstanceAiMessage[];
}

/**
 * Pluggable per-artifact-type capture contract.
 *
 * Methods (not arrow-function properties) are deliberate: method parameters
 * are bivariant, so a concrete `ArtifactHandler<WorkflowResponse>` stays
 * assignable into a heterogeneous `ArtifactHandler[]` array. Arrow-property
 * params are contravariant under strictFunctionTypes and would break that.
 */
export interface ArtifactHandler<TArtifact = unknown> {
	type: ArtifactType;
	/** Whether this artifact type is graded via mock-execution scenarios (workflow) vs statically (agent, config-eval). */
	runsExecutionScenarios: boolean;
	discover(ctx: DiscoverContext): ArtifactRef[];
	fetch(ref: ArtifactRef, client: N8nClient): Promise<TArtifact>;
	/** Render the fetched artifact into a prompt block for the assertion judge. */
	renderArtifact(artifact: TArtifact): string;
	/** Type-scoped deterministic checks. Optional forward hook — unset for types that ship none. */
	binaryChecks?: BinaryCheck[];
}

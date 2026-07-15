// ---------------------------------------------------------------------------
// Pluggable artifact capture contract.
//
// Each artifact type (workflow, agent, config-eval, ...) implements this
// interface once: how to discover references to it in the transcript, how to
// fetch the full artifact, and how to render it for the judge prompt. The
// registry (./registry.ts) resolves a handler by ArtifactType.
//
// Per-type composite artifact shapes (AgentArtifact, ConfigEvalArtifact) also
// live here rather than in their handler files, so the handler and renderer
// modules can both import the shape without a handler <-> renderer cycle.
//
// Composite artifact shapes live here; ArtifactVerdict lives in ../../types to avoid a cycle.
// ---------------------------------------------------------------------------

import type { AgentSkill, EvaluationConfigDto, InstanceAiMessage } from '@n8n/api-types';

import type { BinaryCheck } from '../../binaryChecks/types';
import type {
	DataTableColumnsResponse,
	DataTableRowsResponse,
	N8nClient,
} from '../../clients/n8n-client';
import type { ArtifactRef, ArtifactType } from '../../types';

export type { ArtifactRef };

/**
 * Signals available to a handler's discover(). Non-workflow handlers read the
 * `artifactRefs` captured from the SSE stream; the workflow handler still reads
 * `messages` for its richer (tool-result + targetResource) discovery.
 */
export interface DiscoverContext {
	artifactRefs: ArtifactRef[];
	messages?: InstanceAiMessage[];
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

/** Agent artifact: sanitized JSON config (secrets stripped → typed `unknown`) + full skills map. */
export interface AgentArtifact {
	config: unknown;
	skills: Record<string, AgentSkill>;
}

/**
 * Config-eval artifact: the workflow's eval configs + the referenced dataset's
 * data table (columns + sample rows). The owning workflow itself is
 * reference/intent only — never part of the graded content.
 */
export interface ConfigEvalArtifact {
	configs: EvaluationConfigDto[];
	dataTable?: { columns: DataTableColumnsResponse; rows: DataTableRowsResponse };
}

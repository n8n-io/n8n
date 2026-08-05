/**
 * Trace-only `agent-snapshot` event: an n8n Agent's config + skill bodies at a
 * point in a conversation, emitted so eval seeding can reconstruct the agent a
 * real thread worked on. Sibling of `build-workflow`'s `compiled-workflow` event.
 *
 * Why an event rather than reading the trace back: an agent is built by the
 * agents-module builder, a separate service, so the delegation's own tool I/O
 * carries no config. Reassembling one from the builder's `read_config` /
 * `patch_config` calls works on a minority of threads (18 of 45 measured),
 * needs positional attribution, and breaks whenever those tool shapes move.
 *
 * The payload is deliberately the shape n8n's own seed restore consumes
 * (`instanceAiEvalSeedAgentSchema`: `{id, config, skills}`), so a consumer stores
 * a seedable artifact rather than something it has to translate.
 *
 * It carries authored prose — instructions and skill bodies are whole documents
 * that routinely name real teams, tools and channels. It is scrubbed on export
 * like every other payload (secrets/PII), but the business prose survives, so
 * anything built from it goes through the scrub recipe before it lands in a case.
 */

import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';

import { emitTraceOnlyChildRun } from './langsmith-tracing';
import { AGENT_SNAPSHOT_TRACE_RUN_NAME } from '../tools/tool-ids';
import type { InstanceAiTraceContext } from '../types';

/** Matches the compiled-workflow gate — LangSmith rejects oversized runs, and a
 *  rejected run loses the whole snapshot rather than degrading. */
const MAX_AGENT_SNAPSHOT_TRACE_CHARS = 1_000_000;

/** Why this snapshot was taken. `attached`/`target-resolved` are BASELINES — the
 *  state the turn opened on, which is what a repair-shaped case seeds from;
 *  `config-updated` is the state after a builder pass mutated it. */
export type AgentSnapshotReason = 'attached' | 'target-resolved' | 'config-updated';

export interface AgentSnapshotArtifact {
	config: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
	/** The builder's own hash of `config` (`getAgentConfigHash`) — a consumer
	 *  dedupes on it, so an unchanged agent doesn't become a second row. */
	configHash?: string | null;
}

/** Hashes already emitted on this trace, so the attach baseline and the
 *  build-agent baseline don't both emit the same state. Keyed on the trace
 *  context (one per run), so it can't outlive the run it belongs to. */
const emittedByTrace = new WeakMap<InstanceAiTraceContext, Set<string>>();

/**
 * Emit one snapshot. Best-effort by contract: tracing must never fail a turn, and
 * a missing snapshot degrades authoring, not the user's build.
 */
export async function emitAgentSnapshotTraceEvent(
	tracing: InstanceAiTraceContext | undefined,
	args: {
		agentId: string;
		projectId: string;
		reason: AgentSnapshotReason;
		artifact: AgentSnapshotArtifact;
		logger?: { debug: (message: string) => void };
	},
	// `skipped` = the tracing layer exported nothing (no live trace, dead handle,
	// exporter error it swallowed); `failed` = this function threw, e.g. a config
	// that can't be serialized. Distinct because only the second is our bug.
): Promise<'emitted' | 'duplicate' | 'skipped' | 'failed'> {
	const { agentId, projectId, reason, artifact } = args;
	try {
		const hash = artifact.configHash ?? null;
		if (tracing && hash) {
			let seen = emittedByTrace.get(tracing);
			if (!seen) {
				seen = new Set();
				emittedByTrace.set(tracing, seen);
			}
			const key = `${agentId}:${hash}`;
			if (seen.has(key)) return 'duplicate';
			seen.add(key);
		}

		const payload = {
			agentId,
			projectId,
			configHash: hash,
			reason,
			config: artifact.config,
			...(artifact.skills ? { skills: artifact.skills } : {}),
		};
		const withinSizeGate = JSON.stringify(payload).length <= MAX_AGENT_SNAPSHOT_TRACE_CHARS;
		const emittedVia = await emitTraceOnlyChildRun(
			tracing,
			{
				name: AGENT_SNAPSHOT_TRACE_RUN_NAME,
				// 'chain' like the compiled-workflow event: a tool-typed run reads as
				// a real agent tool call in trace UIs.
				runType: 'chain',
				canonicalName: `instance-ai.${AGENT_SNAPSHOT_TRACE_RUN_NAME}`,
				tags: [AGENT_SNAPSHOT_TRACE_RUN_NAME],
				metadata: { agent_id: agentId, config_hash: hash, snapshot_reason: reason },
			},
			withinSizeGate
				? { outputs: payload, rawOutputs: true }
				: { outputs: { agentId, projectId, configHash: hash, reason, truncated: true } },
		);
		args.logger?.debug(
			`[agent-snapshot] ${reason} for ${agentId}: ${emittedVia}${withinSizeGate ? '' : ' (over size gate, emitted truncated marker)'}`,
		);
		return emittedVia === 'skipped' ? 'skipped' : 'emitted';
	} catch (error) {
		args.logger?.debug(
			`[agent-snapshot] ${reason} for ${agentId} failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 'failed';
	}
}

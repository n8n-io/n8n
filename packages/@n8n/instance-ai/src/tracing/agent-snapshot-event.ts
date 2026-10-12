/**
 * Trace-only `agent-snapshot` event — an agent's config + skills at a point in a
 * conversation, so eval seeding can reconstruct it. Sibling of
 * `build-workflow`'s `compiled-workflow` event: the agents-module builder is a
 * separate service, so no tool I/O in the trace carries the config.
 *
 * Payload is shaped for `instanceAiEvalSeedAgentSchema` — the consumer maps
 * `agentId` → `id` and drops the trace-only keys. It carries authored prose that
 * export scrubbing does NOT remove — scrub anything built from it before it
 * lands in a case.
 */

import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';

import { emitTraceOnlyChildRun } from './langsmith-tracing';
import { AGENT_SNAPSHOT_TRACE_RUN_NAME } from '../tools/tool-ids';
import type { InstanceAiTraceContext } from '../types';

/** Matches the compiled-workflow gate: LangSmith rejects an oversized run whole. */
const MAX_AGENT_SNAPSHOT_TRACE_CHARS = 1_000_000;

/** `attached`/`target-resolved` are BASELINES (state the turn opened on). */
export type AgentSnapshotReason = 'attached' | 'target-resolved' | 'config-updated';

export interface AgentSnapshotArtifact {
	config: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
	/** The builder's own hash (`getAgentConfigHash`) — consumers dedupe on it. */
	configHash?: string | null;
}

/** Emitted hashes per trace, so two triggers on one turn don't double-emit. */
const emittedByTrace = new WeakMap<InstanceAiTraceContext, Set<string>>();

/** Emit one snapshot. Best-effort: tracing must never fail a turn. */
export async function emitAgentSnapshotTraceEvent(
	tracing: InstanceAiTraceContext | undefined,
	args: {
		agentId: string;
		projectId: string;
		reason: AgentSnapshotReason;
		artifact: AgentSnapshotArtifact;
		logger?: { debug: (message: string) => void };
	},
	// `skipped` = the tracing layer exported nothing; `failed` = we threw. Only
	// the second is our bug.
): Promise<'emitted' | 'duplicate' | 'skipped' | 'failed'> {
	const { agentId, projectId, reason, artifact } = args;
	// Claimed before the emit so two concurrent triggers can't double-write, and
	// released below unless it landed, so a skip or a throw stays retryable.
	let claim: { seen: Set<string>; key: string } | undefined;
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
			claim = { seen, key };
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
		if (emittedVia === 'skipped') {
			claim?.seen.delete(claim.key);
			return 'skipped';
		}
		return 'emitted';
	} catch (error) {
		claim?.seen.delete(claim.key);
		args.logger?.debug(
			`[agent-snapshot] ${reason} for ${agentId} failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 'failed';
	}
}

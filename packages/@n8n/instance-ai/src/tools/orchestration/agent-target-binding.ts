/**
 * Thread-persisted agent-builder target binding. Mirrors the workflow source
 * file bindings: one ACTIVE agent target per thread (the most recently created
 * or explicitly targeted agent), plus a session registry of every agent
 * targeted in this conversation keyed by a model-authored ref. Persisting the
 * target in thread metadata lets follow-up turns keep editing the same agent
 * instead of creating a new one — including after a cancelled build.
 */
import { z } from 'zod';

import {
	AGENT_PREVIEW_SESSION_METADATA_KEY,
	type AgentPreviewSession,
} from './agent-preview-session-binding';
import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

const METADATA_KEY = 'instanceAiAgentBuilderTarget';
const REGISTRY_METADATA_KEY = 'instanceAiAgentBuilderTargets';
/**
 * Set by the frontend when the user opens a new-agent artifact that has no
 * agent row behind it yet, so the artifact survives a reload before anything
 * is persisted. Cleared here the moment a real agent binds to the thread —
 * whether the chat created it or the user configured it by hand — so a reload
 * doesn't show a phantom blank artifact beside the real one.
 */
export const PENDING_AGENT_METADATA_KEY = 'instanceAiPendingAgentTarget';

const agentBuilderTargetSchema = z.object({
	agentId: z.string(),
	projectId: z.string(),
	/** Agent display name when known — lets the FE label the agent artifact. */
	name: z.string().optional(),
	/**
	 * Model-authored addressing key, and the registry's key. Optional: the
	 * editor/preview handoffs seed a target from an agentId alone, and active
	 * bindings persisted before this field existed carry none.
	 */
	ref: z.string().optional(),
});

export type AgentBuilderTarget = z.infer<typeof agentBuilderTargetSchema>;

const agentBuilderTargetRegistrySchema = z.record(z.string(), agentBuilderTargetSchema);

const pendingAgentTargetSchema = z.object({ projectId: z.string(), agentId: z.string() });

export type PendingAgentTarget = z.infer<typeof pendingAgentTargetSchema>;

/**
 * The id the frontend minted for an unsaved new-agent artifact, so a build
 * creates the agent the user already has open instead of a second one.
 * Best-effort: without a marker (or on a storage failure) the caller falls back
 * to letting the backend mint an id, which is a worse artifact experience but
 * never a failed build.
 */
export async function readPendingAgentTarget(
	context: InstanceAiContext,
): Promise<PendingAgentTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		const parsed = pendingAgentTargetSchema.safeParse(
			thread?.metadata?.[PENDING_AGENT_METADATA_KEY],
		);
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

/** Normalize an addressing key so "Support Triage", "support_triage" and
 *  "Support-Triage" all address the same agent. Unicode letters/digits are kept
 *  so a non-Latin agent name still yields a usable key. */
export function normalizeAgentRef(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function parseTarget(raw: unknown): AgentBuilderTarget | undefined {
	const parsed = agentBuilderTargetSchema.safeParse(raw);
	return parsed.success ? parsed.data : undefined;
}

function parseRegistry(raw: unknown): Record<string, AgentBuilderTarget> {
	const parsed = agentBuilderTargetRegistrySchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

async function readThreadTarget(
	context: InstanceAiContext,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	// Let storage failures propagate (AGENT-353): a follow-up turn must edit
	// the thread-persisted target rather than silently falling back to "no
	// target", which would let the caller create a second agent instead of
	// continuing the existing one.
	const thread = await getThread(context.threadMemory, context.threadId);
	return parseTarget(thread?.metadata?.[METADATA_KEY]);
}

/**
 * Resolve the active build target: in-memory context first (current run),
 * then the thread-persisted binding (previous turns). Hydrates the context so
 * subsequent calls in the same run skip the metadata read.
 */
export async function resolveAgentBuilderTarget(
	context: InstanceAiContext,
): Promise<AgentBuilderTarget | undefined> {
	if (context.agentBuilderTarget) return context.agentBuilderTarget;

	const target = await readThreadTarget(context);
	if (target) context.agentBuilderTarget = target;
	return target;
}

/**
 * Persist the build target to thread metadata. A no-op (with a warning) when
 * thread persistence is unavailable — unreachable in practice, since every
 * real instance-AI session carries `threadMemory`/`threadId`.
 */
export async function saveAgentBuilderTarget(
	context: InstanceAiContext,
	target: AgentBuilderTarget,
	options?: { previewSession?: AgentPreviewSession },
): Promise<void> {
	if (!context.threadMemory || !context.threadId) {
		context.logger?.warn('Cannot persist agent-builder target: no thread persistence available', {
			agentId: target.agentId,
		});
		return;
	}

	// Let write failures propagate (AGENT-353): swallowing them here would let
	// the build flow report success while the next turn has no binding and
	// creates a new agent instead of editing the one just built.
	await patchThread(context.threadMemory, {
		threadId: context.threadId,
		update: ({ metadata = {} }) => {
			// Omitted from the returned metadata, which `patchThread` writes
			// wholesale — that is what deletes the pending marker.
			const { [PENDING_AGENT_METADATA_KEY]: _pendingAgent, ...carriedMetadata } = metadata;
			const existingRegistry = parseRegistry(metadata[REGISTRY_METADATA_KEY]);
			const previousByAgentId = Object.values(existingRegistry).find(
				(entry) => entry.agentId === target.agentId,
			);
			// An agentId-path / display-name refresh may omit name or ref; keep the
			// values recorded when the agent was first addressed so lookup and the
			// FE artifact label stay correct.
			const entry: AgentBuilderTarget = {
				...target,
				...(target.name === undefined && previousByAgentId?.name !== undefined
					? { name: previousByAgentId.name }
					: {}),
				...(target.ref === undefined && previousByAgentId?.ref !== undefined
					? { ref: previousByAgentId.ref }
					: {}),
			};
			const registry = { ...existingRegistry };
			if (entry.ref) {
				const normalized = normalizeAgentRef(entry.ref);
				// Drop any prior keys that pointed at this agentId so a changed
				// addressing key doesn't leave a stale alias.
				for (const [key, existing] of Object.entries(registry)) {
					if (existing.agentId === entry.agentId) delete registry[key];
				}
				registry[normalized] = { ...entry, ref: normalized };
			}
			return {
				metadata: {
					...carriedMetadata,
					[METADATA_KEY]: entry,
					[REGISTRY_METADATA_KEY]: registry,
					...(options?.previewSession
						? { [AGENT_PREVIEW_SESSION_METADATA_KEY]: options.previewSession }
						: {}),
				},
			};
		},
	});
}

/**
 * Find an agent already targeted in this conversation by its addressing key.
 * Best-effort: returns undefined without thread persistence or on a
 * malformed/empty registry.
 */
export async function getSessionAgentByRef(
	context: InstanceAiContext,
	ref: string,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	// Unlike `readThreadTarget`, a malformed/missing registry is not an
	// unusual failure worth propagating — it's normal for a thread with no
	// prior targets. Let a `getThread` rejection propagate though (AGENT-353):
	// silently returning undefined there would cause a duplicate agent.
	const thread = await getThread(context.threadMemory, context.threadId);
	const registry = parseRegistry(thread?.metadata?.[REGISTRY_METADATA_KEY]);
	return registry[normalizeAgentRef(ref)];
}

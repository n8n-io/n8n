/**
 * Thread-persisted agent-builder target binding. Mirrors the workflow source
 * file bindings, but as a single thread-level record: one ACTIVE agent
 * target per thread (the most recently created or explicitly targeted agent
 * — `build-agent` calls with `name`/`agentId` rebind it), matching
 * `context.agentBuilderTarget` semantics. Persisting the target in thread
 * metadata lets follow-up turns keep editing the same agent instead of
 * creating a new one.
 *
 * Alongside the single active target, a session registry of every agent
 * targeted in this conversation is also kept in thread metadata. This lets
 * `build-agent` recognize a `name` that was already built/targeted earlier
 * in the conversation and switch back to it instead of creating a duplicate.
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

const agentBuilderTargetSchema = z.object({
	agentId: z.string(),
	projectId: z.string(),
	/** Agent display name when known — lets the FE label the agent artifact. */
	name: z.string().optional(),
});

export type AgentBuilderTarget = z.infer<typeof agentBuilderTargetSchema>;

/** Ordered oldest-first, most recently saved last; deduped by `agentId`. */
const agentBuilderTargetRegistrySchema = z.array(agentBuilderTargetSchema);

function parseTarget(raw: unknown): AgentBuilderTarget | undefined {
	const parsed = agentBuilderTargetSchema.safeParse(raw);
	return parsed.success ? parsed.data : undefined;
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
			const parsed = agentBuilderTargetRegistrySchema.safeParse(metadata[REGISTRY_METADATA_KEY]);
			const existingRegistry = parsed.success ? parsed.data : [];
			const previous = existingRegistry.find((entry) => entry.agentId === target.agentId);
			// An agentId-path save carries no name; keep the name recorded when the
			// agent was created so switch-back-by-name keeps working.
			const entry: AgentBuilderTarget =
				target.name === undefined && previous?.name !== undefined
					? { ...target, name: previous.name }
					: target;
			const registry = existingRegistry.filter((e) => e.agentId !== target.agentId);
			registry.push(entry);
			return {
				metadata: {
					...metadata,
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

/** Trimmed, case-insensitive comparison — the orchestrator LLM may paraphrase
 *  an agent name's casing/whitespace, and that must not create a duplicate. */
export function agentNamesMatch(a: string | undefined, b: string | undefined): boolean {
	if (a === undefined || b === undefined) return false;
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Find an agent already targeted in this conversation by its display name
 * (most recently targeted wins on duplicates). Lets `build-agent` switch
 * back to a previously built agent by name instead of creating a duplicate.
 * Best-effort: returns undefined without thread persistence or on a
 * malformed registry.
 */
export async function findSessionAgentByName(
	context: InstanceAiContext,
	name: string,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	// Unlike `readThreadTarget`, a malformed/missing registry is not an
	// unusual failure worth propagating — it's normal for a thread with no
	// prior targets. Let a `getThread` rejection propagate though (AGENT-353):
	// silently returning undefined there would cause a duplicate agent.
	const thread = await getThread(context.threadMemory, context.threadId);
	const parsed = agentBuilderTargetRegistrySchema.safeParse(
		thread?.metadata?.[REGISTRY_METADATA_KEY],
	);
	const registry = parsed.success ? parsed.data : [];

	for (let i = registry.length - 1; i >= 0; i--) {
		if (agentNamesMatch(registry[i].name, name)) return registry[i];
	}
	return undefined;
}

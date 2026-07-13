/**
 * Thread-persisted agent-builder target binding. Mirrors the workflow source
 * file bindings, but as a single thread-level record: one agent is being
 * built/edited per thread, matching `context.agentBuilderTarget` semantics.
 * Persisting the target in thread metadata lets follow-up turns keep editing
 * the same agent instead of creating a new one.
 */
import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

const METADATA_KEY = 'instanceAiAgentBuilderTarget';

const agentBuilderTargetSchema = z.object({
	agentId: z.string(),
	projectId: z.string(),
	/** Agent display name when known — lets the FE label the agent artifact. */
	name: z.string().optional(),
});

export type AgentBuilderTarget = z.infer<typeof agentBuilderTargetSchema>;

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
		update: ({ metadata = {} }) => ({
			metadata: { ...metadata, [METADATA_KEY]: target },
		}),
	});
}

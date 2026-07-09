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
});

export type AgentBuilderTarget = z.infer<typeof agentBuilderTargetSchema>;

const fallbackTargets = new WeakMap<InstanceAiContext, AgentBuilderTarget>();

function parseTarget(raw: unknown): AgentBuilderTarget | undefined {
	const parsed = agentBuilderTargetSchema.safeParse(raw);
	return parsed.success ? parsed.data : undefined;
}

async function readThreadTarget(
	context: InstanceAiContext,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return parseTarget(thread?.metadata?.[METADATA_KEY]);
	} catch (error) {
		context.logger?.debug('Failed to read agent-builder target from thread metadata', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
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

	const target = (await readThreadTarget(context)) ?? fallbackTargets.get(context);
	if (target) context.agentBuilderTarget = target;
	return target;
}

/** Persist the build target to thread metadata (in-memory fallback when unavailable). */
export async function saveAgentBuilderTarget(
	context: InstanceAiContext,
	target: AgentBuilderTarget,
): Promise<void> {
	if (context.threadMemory && context.threadId) {
		try {
			const updatedThread = await patchThread(context.threadMemory, {
				threadId: context.threadId,
				update: ({ metadata = {} }) => ({
					metadata: { ...metadata, [METADATA_KEY]: target },
				}),
			});
			if (updatedThread) return;
		} catch (error) {
			context.logger?.warn('Failed to persist agent-builder target to thread metadata', {
				agentId: target.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	fallbackTargets.set(context, target);
}

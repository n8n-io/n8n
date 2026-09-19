import { z } from 'zod';

import { getThread, patchThread } from '../storage/thread-patch';
import type { InstanceAiContext } from '../types';
import type { IntentRoute, RouterState } from './schemas';

const METADATA_KEY = 'instanceAiFastPath';

/** Thread-persisted memory of what the fast path did, so the next turn can route without a model. */
export const fastPathThreadStateSchema = z.object({
	pendingSession: z
		.object({
			kind: z.enum(['workflow', 'agent']),
			sessionId: z.string(),
			fields: z.array(z.string()),
		})
		.optional(),
	boundWorkflowId: z.string().optional(),
	lastAgentSessionId: z.string().optional(),
	previousRoute: z.string().optional(),
});
export type FastPathThreadState = z.infer<typeof fastPathThreadStateSchema>;

export async function readFastPathState(
	context: Pick<InstanceAiContext, 'threadMemory' | 'threadId'>,
): Promise<FastPathThreadState> {
	if (!context.threadMemory || !context.threadId) return {};
	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		const parsed = fastPathThreadStateSchema.safeParse(thread?.metadata?.[METADATA_KEY]);
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

export async function writeFastPathState(
	context: Pick<InstanceAiContext, 'threadMemory' | 'threadId' | 'logger'>,
	update: (current: FastPathThreadState) => FastPathThreadState,
): Promise<void> {
	if (!context.threadMemory || !context.threadId) return;
	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				const parsed = fastPathThreadStateSchema.safeParse(metadata[METADATA_KEY]);
				const next = update(parsed.success ? parsed.data : {});
				return { metadata: { ...metadata, [METADATA_KEY]: next } };
			},
		});
	} catch (error) {
		context.logger?.debug('Failed to persist fast-path state', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/** Router state for this turn: persisted fast-path memory plus what the host knows. */
export function toRouterState(
	persisted: FastPathThreadState,
	context: InstanceAiContext,
	extras: Partial<RouterState> = {},
): RouterState {
	const previousRoute = persisted.previousRoute;
	return {
		...(persisted.pendingSession ? { pendingSession: persisted.pendingSession } : {}),
		...(persisted.boundWorkflowId ? { boundWorkflowId: persisted.boundWorkflowId } : {}),
		...((context.agentBuilderTarget?.ref ?? context.agentBuilderTarget?.agentId)
			? { boundAgentRef: context.agentBuilderTarget?.ref ?? context.agentBuilderTarget?.agentId }
			: {}),
		...(previousRoute && isIntentRoute(previousRoute) ? { previousRoute } : {}),
		...((context.currentUserAttachments?.length ?? 0) > 0 ? { hasAttachments: true } : {}),
		...extras,
	};
}

function isIntentRoute(value: string): value is IntentRoute {
	return [
		'workflow.create',
		'workflow.edit',
		'workflow.debug',
		'agent.create',
		'agent.edit',
		'agent.verify',
		'answer',
		'orchestrator',
	].includes(value);
}

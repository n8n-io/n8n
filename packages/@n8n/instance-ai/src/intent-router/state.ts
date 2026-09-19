import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { z } from 'zod';

import { getThread, patchThread } from '../storage/thread-patch';
import type { InstanceAiContext } from '../types';
import { intentRouteSchema, type RouterState } from './schemas';

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

function parseState(raw: unknown): FastPathThreadState {
	const parsed = fastPathThreadStateSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

export async function readFastPathState(
	context: Pick<InstanceAiContext, 'threadMemory' | 'threadId'>,
): Promise<FastPathThreadState> {
	if (!context.threadMemory || !context.threadId) return {};
	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return parseState(thread?.metadata?.[METADATA_KEY]);
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
			update: ({ metadata = {} }) => ({
				metadata: { ...metadata, [METADATA_KEY]: update(parseState(metadata[METADATA_KEY])) },
			}),
		});
	} catch (error) {
		context.logger?.debug('Failed to persist fast-path state', { error: getErrorMessage(error) });
	}
}

/** Router state for this turn: persisted fast-path memory plus what the host knows. */
export function toRouterState(
	persisted: FastPathThreadState,
	context: InstanceAiContext,
	extras: Partial<RouterState> = {},
): RouterState {
	const boundAgentRef = context.agentBuilderTarget?.ref ?? context.agentBuilderTarget?.agentId;
	const previousRoute = intentRouteSchema.safeParse(persisted.previousRoute);
	return {
		...(persisted.pendingSession ? { pendingSession: persisted.pendingSession } : {}),
		...(persisted.boundWorkflowId ? { boundWorkflowId: persisted.boundWorkflowId } : {}),
		...(boundAgentRef ? { boundAgentRef } : {}),
		...(previousRoute.success ? { previousRoute: previousRoute.data } : {}),
		...((context.currentUserAttachments?.length ?? 0) > 0 ? { hasAttachments: true } : {}),
		...extras,
	};
}

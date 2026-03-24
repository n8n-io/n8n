import type { InstanceAiEventType } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';

/**
 * Check if the current context is on a canvas for a given workflow.
 * Returns true when canvasContext is present and matches the workflowId.
 */
export function isOnCanvas(context: InstanceAiContext, workflowId: string): boolean {
	return !!(context.canvasContext && context.canvasContext.workflowId === workflowId);
}

/**
 * Publish an SSE event to the canvas via the event bus.
 * No-op when eventBus or threadId is not available.
 *
 * The event is constructed with the current runId and a default agentId.
 * The `as never` cast is needed because the discriminated union requires
 * exact type+payload combinations, but at runtime we know the event is valid.
 */
export function publishCanvasEvent(
	context: InstanceAiContext,
	type: InstanceAiEventType,
	payload: Record<string, unknown>,
): void {
	if (!context.eventBus || !context.threadId || !context.runId) return;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	context.eventBus.publish(context.threadId, {
		type,
		runId: context.runId,
		agentId: 'orchestrator',
		payload,
	} as never);
}

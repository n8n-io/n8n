import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import type { RestrictedNodeSummary } from '../../types';

/**
 * Publishes one `restricted-node-notice` event for each restricted type a tool call found, so the
 * chat can mark the type in the reply.
 */
export function createRestrictedNodeNoticePublisher(options: {
	eventBus: Pick<InstanceAiEventBus, 'publish'>;
	threadId: string;
	runId: string;
	agentId: string;
}): (toolCallId: string, nodes: readonly RestrictedNodeSummary[]) => void {
	const { eventBus, threadId, runId, agentId } = options;

	return (toolCallId, nodes) => {
		for (const node of nodes) {
			eventBus.publish(threadId, {
				type: 'restricted-node-notice',
				runId,
				agentId,
				payload: {
					toolCallId,
					nodeType: node.name,
					displayName: node.displayName,
					scope: node.scope,
				},
			});
		}
	};
}

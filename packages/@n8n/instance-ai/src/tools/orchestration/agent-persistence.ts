import type { OrchestrationContext } from '../../types';

export function getSubAgentPersistence(context: OrchestrationContext) {
	return {
		threadId: context.threadId,
		resourceId: context.userId,
	};
}

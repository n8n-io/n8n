import type { AgentSessionPreviewAccess, AgentThreadMemoryDto } from '@n8n/api-types';

import type { ThreadDetail } from '../agent-execution.service';
import { canContinueThreadInPreview } from './agent-thread-access';

/**
 * The thread detail response of a session timeline. It omits the ownership
 * fields of the thread and adds the source of the first execution with a
 * source, and whether the user can continue the thread in Preview.
 */
export function toThreadDetailResponse(
	{ thread, executions }: ThreadDetail,
	{
		userId,
		isSystemAgent,
		memory,
	}: { userId: string; isSystemAgent: boolean; memory: AgentThreadMemoryDto },
) {
	const { ownerId: _ownerId, accessScope: _accessScope, owner: _owner, ...publicThread } = thread;
	const source = executions.find((execution) => execution.source !== null)?.source;
	const access: AgentSessionPreviewAccess = {
		canContinueInPreview: canContinueThreadInPreview(thread, userId, source, isSystemAgent),
	};
	return {
		thread: { ...publicThread, ...access, source: source ?? null },
		executions,
		memory,
	};
}

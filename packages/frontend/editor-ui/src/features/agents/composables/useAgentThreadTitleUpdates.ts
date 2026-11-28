import { getCurrentScope, onScopeDispose } from 'vue';
import type { PushPayload } from '@n8n/api-types';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

export type AgentThreadTitleUpdate = PushPayload<'agentThreadTitleUpdated'>;

/**
 * Calls `onTitle` when the server stores a generated thread title. The server
 * sends the title while the first turn still runs, so lists do not wait for the
 * turn to end. Does not connect the push client: the chat that runs the turn
 * already holds the connection.
 */
export function useAgentThreadTitleUpdates(
	onTitle: (update: AgentThreadTitleUpdate) => void,
): void {
	const pushStore = usePushConnectionStore();
	const removeListener = pushStore.addEventListener((event) => {
		if (event.type === 'agentThreadTitleUpdated') onTitle(event.data);
	});
	if (getCurrentScope()) onScopeDispose(() => removeListener?.());
}

import { onScopeDispose, type Ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

interface AgentExecutionUpdatesTarget {
	projectId: Ref<string>;
	agentId: Ref<string>;
	/** Pin to one thread. Omit to accept any thread belonging to the agent. */
	threadId?: Ref<string | undefined>;
}

/**
 * Call `onUpdate` when the backend records a turn for this agent. The push is an
 * invalidation signal, not the data, so the callback has to re-read.
 *
 * Connects the shared push client but never disconnects it — the editor has one
 * connection, and tearing it down here would cut off everything else on it.
 */
export function useAgentExecutionUpdates(
	target: AgentExecutionUpdatesTarget,
	onUpdate: () => void | Promise<void>,
	onInvalidate?: () => void,
): () => void {
	const pushStore = usePushConnectionStore();

	function matches(event: PushMessage): boolean {
		if (event.type !== 'agentExecutionUpdated') return false;
		if (event.data.projectId !== target.projectId.value) return false;
		if (event.data.agentId !== target.agentId.value) return false;
		const threadId = target.threadId?.value;
		return !threadId || event.data.threadId === threadId;
	}

	// Combine push notifications into one active refresh and one queued refresh.
	let inFlight: Promise<void> | undefined;
	let queued = false;
	let disposed = false;

	function run(): void {
		if (disposed) return;
		if (inFlight) {
			queued = true;
			return;
		}
		// Run the callback in a promise so synchronous errors do not escape push dispatch.
		inFlight = Promise.resolve()
			.then(async () => {
				if (!disposed) await onUpdate();
			})
			.catch(() => {})
			.finally(() => {
				inFlight = undefined;
				if (queued) {
					queued = false;
					run();
				}
			});
	}

	const removeListener = pushStore.addEventListener((event) => {
		if (matches(event)) {
			onInvalidate?.();
			run();
		}
	});
	pushStore.pushConnect();

	// Remove this listener and stop queued refreshes without disconnecting the shared connection.
	onScopeDispose(() => {
		disposed = true;
		removeListener();
	});
	return run;
}

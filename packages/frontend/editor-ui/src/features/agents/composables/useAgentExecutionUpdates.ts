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
): void {
	const pushStore = usePushConnectionStore();

	function matches(event: PushMessage): boolean {
		if (event.type !== 'agentExecutionUpdated') return false;
		if (event.data.projectId !== target.projectId.value) return false;
		if (event.data.agentId !== target.agentId.value) return false;
		const threadId = target.threadId?.value;
		return !threadId || event.data.threadId === threadId;
	}

	// Updates are broadcast per execution record and again on finalize, for every
	// surface of the agent — so bursts are normal. Coalesce them into one trailing
	// run instead of firing a fetch per message.
	let inFlight: Promise<void> | undefined;
	let queued = false;

	function run(): void {
		if (inFlight) {
			queued = true;
			return;
		}
		// `.then(onUpdate)` rather than `Promise.resolve(onUpdate())` so a callback that
		// throws synchronously is caught here instead of escaping into push dispatch.
		inFlight = Promise.resolve()
			.then(onUpdate)
			.catch(() => {})
			.finally(() => {
				inFlight = undefined;
				if (queued) {
					queued = false;
					run();
				}
			});
	}

	pushStore.pushConnect();
	const removeListener = pushStore.addEventListener((event) => {
		if (matches(event)) run();
	});

	onScopeDispose(() => removeListener());
}

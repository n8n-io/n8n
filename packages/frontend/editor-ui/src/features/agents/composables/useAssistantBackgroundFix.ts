import { useRootStore } from '@n8n/stores/useRootStore';
import { v4 as uuidv4 } from 'uuid';
import { computed, ref, watch, type WatchStopHandle } from 'vue';

import { INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY } from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore, useThread } from '@/features/ai/instanceAi/instanceAi.store';

export type BackgroundFixStatus = 'idle' | 'starting' | 'working' | 'done' | 'failed';

/**
 * Wireframe: "Fix with Assistant" without leaving the card. Opens an Assistant
 * thread targeting the agent, sends the draft, and mirrors progress back. The
 * caller decides what happens when the run settles (rerun the check).
 */
export function useAssistantBackgroundFix() {
	const instanceAiStore = useInstanceAiStore();
	const rootStore = useRootStore();

	const status = ref<BackgroundFixStatus>('idle');
	const threadId = ref<string | null>(null);
	const runtime = computed(() => (threadId.value ? useThread(threadId.value) : null));

	/** Latest assistant text, trimmed to a glance. */
	const progress = computed(() => {
		const messages = runtime.value?.messages ?? [];
		const last = [...messages].reverse().find((m) => m.role === 'assistant');
		const text = (last?.content || last?.reasoning || '').replace(/\s+/g, ' ').trim();
		return text.length > 220 ? `${text.slice(0, 219)}…` : text;
	});
	const tasks = computed(() => runtime.value?.currentTasks?.tasks ?? []);

	let stopWatch: WatchStopHandle | undefined;

	async function start(
		params: { projectId: string; agentId: string; agentName?: string; draft: string },
		onSettled: () => void | Promise<void>,
	) {
		if (status.value === 'starting' || status.value === 'working') return;
		status.value = 'starting';
		const id = uuidv4();
		try {
			await instanceAiStore.syncThread(id, params.projectId, { source: 'agent_preview' });
			await instanceAiStore.updateThreadMetadata(id, {
				[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: {
					agentId: params.agentId,
					projectId: params.projectId,
					...(params.agentName ? { name: params.agentName } : {}),
				},
			});
			threadId.value = id;
			const thread = useThread(id);
			const sent = await thread.sendMessage(params.draft, undefined, rootStore.pushRef);
			if (!sent) throw new Error('send failed');
			status.value = 'working';
			let sawStreaming = thread.isStreaming;
			stopWatch?.();
			stopWatch = watch(
				() => thread.isStreaming,
				(streaming) => {
					if (streaming) sawStreaming = true;
					if (!streaming && sawStreaming) {
						stopWatch?.();
						status.value = 'done';
						void onSettled();
					}
				},
			);
		} catch {
			status.value = 'failed';
		}
	}

	function reset() {
		stopWatch?.();
		status.value = 'idle';
		threadId.value = null;
	}

	return { status, threadId, progress, tasks, start, reset };
}

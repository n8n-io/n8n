import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';

import { INSTANCE_AI_THREAD_VIEW } from './constants';
import { useInstanceAiAvailable } from './composables/useInstanceAiAvailability';
import { ensurePersonalProjectId } from './composables/useInstanceAiHandoff';
import { useInstanceAiStore } from './instanceAi.store';
import type { ProactiveOffer } from './instanceAiPanel.types';
import { resolveQuickHelpThreadId } from './resolveQuickHelpThread';

export type { ProactiveOffer } from './instanceAiPanel.types';

export const useInstanceAiPanelStore = defineStore(STORES.INSTANCE_AI_PANEL, () => {
	const router = useRouter();
	const rootStore = useRootStore();
	const toast = useToast();
	const instanceAiStore = useInstanceAiStore();
	const instanceAiAvailable = useInstanceAiAvailable();

	const isOpen = ref(false);
	const activeThreadId = ref<string | null>(null);
	const pendingOffer = ref<ProactiveOffer | null>(null);

	const isAvailable = computed(() => instanceAiAvailable.value);

	let seedInFlight = false;
	let openInFlight = false;

	async function ensureActiveThread(): Promise<string | null> {
		if (activeThreadId.value) return activeThreadId.value;

		const projectId = await ensurePersonalProjectId();
		if (!projectId) {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return null;
		}

		const threadId = await resolveQuickHelpThreadId(projectId);
		try {
			await instanceAiStore.syncThread(threadId, projectId, {
				source: 'assistant_page',
				origin: 'internal',
			});
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return null;
		}

		activeThreadId.value = threadId;
		instanceAiStore.getOrCreateRuntime(threadId, projectId);
		return threadId;
	}

	function open() {
		if (!isAvailable.value) return;
		isOpen.value = true;
	}

	async function openOrCreate(): Promise<boolean> {
		if (!isAvailable.value || openInFlight) return false;
		openInFlight = true;
		try {
			const threadId = await ensureActiveThread();
			if (!threadId) return false;
			isOpen.value = true;
			return true;
		} finally {
			openInFlight = false;
		}
	}

	function close() {
		isOpen.value = false;
		pendingOffer.value = null;
	}

	async function toggle(): Promise<void> {
		if (isOpen.value) {
			close();
			return;
		}
		await openOrCreate();
	}

	/**
	 * Open the floating panel on the project's quick-help thread and send the
	 * offer message — same shape as handoff `startThread`, minus navigation.
	 */
	async function openWithSeed(offer: ProactiveOffer): Promise<boolean> {
		if (!isAvailable.value || seedInFlight) return false;
		seedInFlight = true;
		try {
			const projectId = offer.projectId ?? (await ensurePersonalProjectId());
			if (!projectId) {
				toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
				return false;
			}

			const threadId = await resolveQuickHelpThreadId(projectId);
			try {
				await instanceAiStore.syncThread(threadId, projectId, {
					source: offer.source,
					origin: 'internal',
					sourceContext: { offerKey: offer.key },
				});
			} catch {
				toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
				return false;
			}

			pendingOffer.value = offer;
			activeThreadId.value = threadId;
			isOpen.value = true;

			const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
			void thread.sendMessage(offer.message, offer.attachments, rootStore.pushRef);
			return true;
		} finally {
			seedInFlight = false;
		}
	}

	async function expandToFullView(): Promise<void> {
		const threadId = activeThreadId.value;
		if (!threadId) return;
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		close();
	}

	return {
		isOpen,
		activeThreadId,
		pendingOffer,
		isAvailable,
		open,
		openOrCreate,
		toggle,
		close,
		openWithSeed,
		expandToFullView,
	};
});

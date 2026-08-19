import type { PushMessage } from '@n8n/api-types';
import { pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { createEventQueue } from '@n8n/utils/create-event-queue';
import { onMounted, onUnmounted, ref } from 'vue';
import type { useRouter } from 'vue-router';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

/**
 * Dispatches push messages to module-registered handlers.
 *
 * Module registration is global and eager, so dispatch has to be too. Mounted at
 * app scope, this is what makes a module's `pushHandlers` run in every layout
 * instead of only where an editor component happens to be mounted.
 *
 * Handlers get the published `ModulePushHandlerContext` — nothing from the
 * editor — so this composable needs no workflow document.
 */
export function useModulePushDispatcher({ router }: { router: ReturnType<typeof useRouter> }) {
	const pushStore = usePushConnectionStore();

	const { enqueue } = createEventQueue<PushMessage>(processEvent);

	const removeEventListener = ref<(() => void) | null>(null);

	async function processEvent(event: PushMessage) {
		const moduleHandler = pushHandlerRegistry.get(event.type);
		if (!moduleHandler) {
			return;
		}

		await moduleHandler(event, { router });
	}

	onMounted(() => {
		removeEventListener.value = pushStore.addEventListener((message) => {
			enqueue(message);
		});
	});

	onUnmounted(() => {
		removeEventListener.value?.();
		removeEventListener.value = null;
	});
}

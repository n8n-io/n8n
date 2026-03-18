import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore } from '@/app/stores/settings.store';
import {
	CHAT_INSTANCE_AI_VIEW,
	CHAT_INSTANCE_AI_THREAD_VIEW,
} from '@/features/ai/chatHub/constants';

export type UnifiedChatProvider = 'chat-hub' | 'instance-ai';

/**
 * Thin composable that checks the current route and returns
 * which chat provider is active. The actual store delegation
 * is done by the consuming component — this just identifies the context.
 */
export function useUnifiedChat() {
	const route = useRoute();
	const router = useRouter();
	const settingsStore = useSettingsStore();

	const isInstanceAiRoute = computed(
		() => route.name === CHAT_INSTANCE_AI_VIEW || route.name === CHAT_INSTANCE_AI_THREAD_VIEW,
	);

	const activeProvider = computed<UnifiedChatProvider>(() =>
		isInstanceAiRoute.value ? 'instance-ai' : 'chat-hub',
	);

	const isInstanceAiAvailable = computed(() => settingsStore.isModuleActive('instance-ai'));

	function navigateToInstanceAi(threadId?: string) {
		if (threadId) {
			void router.push({
				name: CHAT_INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
			});
		} else {
			void router.push({ name: CHAT_INSTANCE_AI_VIEW });
		}
	}

	return {
		activeProvider,
		isInstanceAiRoute,
		isInstanceAiAvailable,
		navigateToInstanceAi,
	};
}

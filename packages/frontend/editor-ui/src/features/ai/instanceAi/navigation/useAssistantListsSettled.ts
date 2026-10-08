import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import { SIDEBAR_LISTS_SETTLE_TIMEOUT } from '@/app/constants/durations';
import { useAssistantSidebarStore } from './assistantSidebar.store';

/**
 * True when the Assistant lists of the sidebar (Chats and Automations) have their first answer,
 * so that a section below them can show without a jump. `waits` is false when no list loads
 * above the section, for example in the collapsed sidebar.
 * After `SIDEBAR_LISTS_SETTLE_TIMEOUT` the lists count as settled, so that a request that never
 * ends cannot hide the section.
 */
export function useAssistantListsSettled(waits: MaybeRefOrGetter<boolean>) {
	const store = useAssistantSidebarStore();
	const isPending = computed(
		() => toValue(waits) && !(store.chatListSettled && store.automationsSettled),
	);

	const timedOut = ref(false);
	const timer = useTimeoutFn(
		() => {
			timedOut.value = true;
		},
		SIDEBAR_LISTS_SETTLE_TIMEOUT,
		{ immediate: false },
	);

	// Each new wait (the first load, an expanded sidebar, a new sign-in) gets the full time.
	watch(
		isPending,
		(pending) => {
			timedOut.value = false;
			if (pending) timer.start();
			else timer.stop();
		},
		{ immediate: true },
	);

	return computed(() => !isPending.value || timedOut.value);
}

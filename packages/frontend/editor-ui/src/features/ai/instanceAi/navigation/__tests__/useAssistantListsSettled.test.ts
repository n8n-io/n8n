import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useUsersStore } from '@n8n/stores/users.store';
import { SIDEBAR_LISTS_SETTLE_TIMEOUT } from '@/app/constants/durations';
import { useAssistantSidebarStore } from '../assistantSidebar.store';
import { useAssistantListsSettled } from '../useAssistantListsSettled';

let scope: EffectScope | undefined;

function mount(waits: Ref<boolean> | boolean = true) {
	scope = effectScope();
	const settled = scope.run(() => useAssistantListsSettled(waits));
	if (!settled) throw new Error('effect scope did not run');
	return settled;
}

describe('useAssistantListsSettled', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		useUsersStore().currentUserId = 'user-1';
	});

	afterEach(() => {
		scope?.stop();
		scope = undefined;
		vi.useRealTimers();
	});

	it('is settled at once when no list loads above the section', () => {
		expect(mount(false).value).toBe(true);
	});

	it('waits for both lists, in any order', async () => {
		const store = useAssistantSidebarStore();
		const settled = mount();
		expect(settled.value).toBe(false);

		store.automationsSettled = true;
		await nextTick();
		expect(settled.value).toBe(false);

		store.chatListSettled = true;
		await nextTick();
		expect(settled.value).toBe(true);
	});

	it('does not wait for the chats alone', async () => {
		const store = useAssistantSidebarStore();
		const settled = mount();

		store.chatListSettled = true;
		await nextTick();

		expect(settled.value).toBe(false);
	});

	it('is settled at once when both lists already have an answer, as after a move to another layout', () => {
		const store = useAssistantSidebarStore();
		store.chatListSettled = true;
		store.automationsSettled = true;

		expect(mount().value).toBe(true);
	});

	it('stops waiting after the timeout when a request never ends', async () => {
		const settled = mount();

		await vi.advanceTimersByTimeAsync(SIDEBAR_LISTS_SETTLE_TIMEOUT - 1);
		expect(settled.value).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(settled.value).toBe(true);
	});

	it('gives a new sign-in the full time again', async () => {
		const store = useAssistantSidebarStore();
		store.chatListSettled = true;
		store.automationsSettled = true;
		const settled = mount();

		useUsersStore().currentUserId = 'user-2';
		await nextTick();
		expect(settled.value).toBe(false);

		await vi.advanceTimersByTimeAsync(SIDEBAR_LISTS_SETTLE_TIMEOUT - 1);
		expect(settled.value).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(settled.value).toBe(true);
	});

	it('starts the time when the wait starts, for example when the sidebar expands', async () => {
		const waits = ref(false);
		const settled = mount(waits);

		await vi.advanceTimersByTimeAsync(SIDEBAR_LISTS_SETTLE_TIMEOUT);
		waits.value = true;
		await nextTick();
		expect(settled.value).toBe(false);

		await vi.advanceTimersByTimeAsync(SIDEBAR_LISTS_SETTLE_TIMEOUT - 1);
		expect(settled.value).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(settled.value).toBe(true);
	});

	it('stops the timer when the wait ends before it', async () => {
		const waits = ref(true);
		const settled = mount(waits);

		waits.value = false;
		await nextTick();
		expect(settled.value).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});
});

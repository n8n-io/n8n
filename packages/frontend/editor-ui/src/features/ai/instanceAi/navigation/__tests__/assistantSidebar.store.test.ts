import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { useAssistantSidebarStore } from '../assistantSidebar.store';

const automation: InstanceAiProvenanceListItem = {
	workflowId: 'wf-1',
	name: 'Weekly report',
	active: true,
	threadId: 'thread-1',
	createdAt: '2026-10-01T09:30:00.000Z',
	canOpenThread: true,
};

/** Fills every part of the state, as a sidebar does while the user works. */
function fill(store: ReturnType<typeof useAssistantSidebarStore>) {
	store.automations = [automation];
	store.automationsRequest = 3;
	store.expandedGroups = new Set(['done']);
	store.chatListSettled = true;
}

describe('useAssistantSidebarStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useUsersStore().currentUserId = 'user-1';
	});

	it('starts with no list, no expanded group and no chat list', () => {
		const store = useAssistantSidebarStore();

		expect(store.automations).toBeUndefined();
		expect([...store.expandedGroups]).toEqual([]);
		expect(store.chatListSettled).toBe(false);
	});

	it('keeps the state for the same user', () => {
		const store = useAssistantSidebarStore();
		fill(store);

		expect(useAssistantSidebarStore().automations).toEqual([automation]);
		expect([...useAssistantSidebarStore().expandedGroups]).toEqual(['done']);
		expect(useAssistantSidebarStore().chatListSettled).toBe(true);
	});

	it.each([
		['a new user signs in', 'user-2'],
		['the user signs out', null],
	])('clears the state at once when %s', (_, nextUserId) => {
		const store = useAssistantSidebarStore();
		fill(store);

		useUsersStore().currentUserId = nextUserId;

		expect(store.automations).toBeUndefined();
		expect([...store.expandedGroups]).toEqual([]);
		expect(store.chatListSettled).toBe(false);
		// A request that started for the previous user no longer matches.
		expect(store.automationsRequest).not.toBe(3);
	});
});

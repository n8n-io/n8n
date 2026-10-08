import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope, type Ref } from 'vue';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { AUTOMATIONS_SHOWN, useMyAutomations } from '../useMyAutomations';

const { fetchMyAutomations, currentUser } = vi.hoisted(() => ({
	fetchMyAutomations: vi.fn(),
	currentUser: { id: 'user-1' as string | null },
}));

vi.mock('../../provenance/provenance.api', () => ({ fetchMyAutomations }));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext }),
}));

// Reactive, so that the composable sees a new sign-in.
const usersStore = reactive(currentUser);
vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		get currentUserId() {
			return usersStore.id;
		},
	}),
}));

const flushPromises = async () => await new Promise(setImmediate);

function automation(
	workflowId: string,
	overrides: Partial<InstanceAiProvenanceListItem> = {},
): InstanceAiProvenanceListItem {
	return {
		workflowId,
		name: `Workflow ${workflowId}`,
		active: false,
		threadId: `thread-${workflowId}`,
		createdAt: '2026-10-01T09:30:00.000Z',
		canOpenThread: true,
		...overrides,
	};
}

let scopes: EffectScope[] = [];

function mount(enabled: Ref<boolean> | boolean = true) {
	const scope = effectScope();
	scopes.push(scope);
	const instance = scope.run(() => useMyAutomations(enabled));
	if (!instance) throw new Error('effect scope did not run');
	return instance;
}

describe('useMyAutomations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		usersStore.id = 'user-1';
	});

	afterEach(() => {
		for (const scope of scopes) scope.stop();
		scopes = [];
	});

	it('loads the newest automations of the user', async () => {
		const items = [automation('wf-2', { active: true }), automation('wf-1')];
		fetchMyAutomations.mockResolvedValue(items);

		const { automations } = mount();
		expect(automations.value).toBeUndefined();
		await flushPromises();

		expect(fetchMyAutomations).toHaveBeenCalledWith(restApiContext, AUTOMATIONS_SHOWN);
		expect(AUTOMATIONS_SHOWN).toBe(5);
		expect(automations.value).toEqual(items);
	});

	it('gives an empty list when the Assistant built nothing yet', async () => {
		fetchMyAutomations.mockResolvedValue([]);

		const { automations } = mount();
		await flushPromises();

		expect(automations.value).toEqual([]);
	});

	it('loads nothing while disabled, and loads when it becomes enabled', async () => {
		fetchMyAutomations.mockResolvedValue([automation('wf-1')]);
		const enabled = ref(false);

		const { automations, refresh } = mount(enabled);
		await refresh();
		await flushPromises();
		expect(fetchMyAutomations).not.toHaveBeenCalled();
		expect(automations.value).toBeUndefined();

		enabled.value = true;
		await nextTick();
		await flushPromises();

		expect(fetchMyAutomations).toHaveBeenCalledTimes(1);
		expect(automations.value).toEqual([automation('wf-1')]);
	});

	it('replaces the list on refresh', async () => {
		fetchMyAutomations.mockResolvedValueOnce([automation('wf-1')]);
		const { automations, refresh } = mount();
		await flushPromises();

		fetchMyAutomations.mockResolvedValueOnce([
			automation('wf-2', { active: true }),
			automation('wf-1'),
		]);
		await refresh();

		expect(fetchMyAutomations).toHaveBeenCalledTimes(2);
		expect(automations.value?.map((item) => item.workflowId)).toEqual(['wf-2', 'wf-1']);
		expect(automations.value?.[0].active).toBe(true);
	});

	it('keeps the last list when a refresh fails', async () => {
		fetchMyAutomations.mockResolvedValueOnce([automation('wf-1')]);
		const { automations, refresh } = mount();
		await flushPromises();

		fetchMyAutomations.mockRejectedValueOnce(new Error('offline'));
		await expect(refresh()).resolves.toBeUndefined();

		expect(automations.value).toEqual([automation('wf-1')]);
	});

	it('stays without a list when the first load fails', async () => {
		fetchMyAutomations.mockRejectedValueOnce(new Error('offline'));

		const { automations } = mount();
		await flushPromises();

		expect(automations.value).toBeUndefined();
	});

	it('keeps the last list while a refresh runs', async () => {
		fetchMyAutomations.mockResolvedValueOnce([automation('wf-1')]);
		const { automations, refresh } = mount();
		await flushPromises();
		const pending = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		fetchMyAutomations.mockReturnValueOnce(pending.promise);

		const running = refresh();
		expect(automations.value).toEqual([automation('wf-1')]);

		pending.resolve([automation('wf-2')]);
		await running;
		expect(automations.value).toEqual([automation('wf-2')]);
	});

	it('ignores a slow answer that comes after a newer one', async () => {
		fetchMyAutomations.mockResolvedValueOnce([]);
		const { automations, refresh } = mount();
		await flushPromises();
		const slow = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		const fast = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		fetchMyAutomations.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

		const first = refresh();
		const second = refresh();
		fast.resolve([automation('new')]);
		await second;
		slow.resolve([automation('old')]);
		await first;

		expect(automations.value).toEqual([automation('new')]);
	});

	it('drops the list of the previous user and loads the list of the new one', async () => {
		fetchMyAutomations.mockResolvedValueOnce([automation('wf-1')]);
		const { automations } = mount();
		await flushPromises();
		const pending = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		fetchMyAutomations.mockReturnValueOnce(pending.promise);

		usersStore.id = 'user-2';
		await nextTick();

		expect(automations.value).toBeUndefined();
		pending.resolve([automation('wf-9')]);
		await flushPromises();
		expect(fetchMyAutomations).toHaveBeenCalledTimes(2);
		expect(automations.value).toEqual([automation('wf-9')]);
	});

	it('ignores an answer for the previous user', async () => {
		const pending = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		fetchMyAutomations.mockReturnValueOnce(pending.promise);
		const enabled = ref(true);
		const { automations } = mount(enabled);

		enabled.value = false;
		usersStore.id = 'user-2';
		await nextTick();
		pending.resolve([automation('wf-1')]);
		await flushPromises();

		expect(automations.value).toBeUndefined();
	});
});

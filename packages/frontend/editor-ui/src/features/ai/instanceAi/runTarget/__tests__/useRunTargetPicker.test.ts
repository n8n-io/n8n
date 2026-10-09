import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import type { LinkedInstanceSummary } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { resetExperienceModeState } from '../../experience/useExperienceMode';
import { useRunTargetPicker } from '../useRunTargetPicker';
import { fetchLinkedInstances } from '@/features/linkedInstances/linkedInstances.api';

vi.mock('@/features/linkedInstances/linkedInstances.api', () => ({
	fetchLinkedInstances: vi.fn(),
}));

const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

function link(id: string, name: string): LinkedInstanceSummary {
	return {
		id,
		name,
		baseUrl: 'https://cloud.example.test',
		status: 'online',
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
	};
}

/** Mounts the composable in a component, so that its watchers run as they do in the view. */
function setup() {
	let result!: ReturnType<typeof useRunTargetPicker>;
	const Host = defineComponent({
		setup() {
			result = useRunTargetPicker();
			return () => h('div');
		},
	});
	mount(Host);
	return () => result;
}

function useExperience(modules: string[], defaultMode: 'simple' | 'power') {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: modules,
	} as typeof settingsStore.settings;
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: true, experience: { enabled: true, defaultMode } },
	} as unknown as typeof settingsStore.moduleSettings;
}

describe('useRunTargetPicker', () => {
	beforeEach(() => {
		// The module check is a store function, which the default testing Pinia would stub.
		createTestingPinia({ stubActions: false });
		resetExperienceModeState();
		useUsersStore().currentUserId = 'user-1';
		vi.mocked(fetchLinkedInstances).mockReset();
		vi.mocked(fetchLinkedInstances).mockResolvedValue([link(OFFICE_ID, 'Office')]);
	});

	it('shows the picker in Power mode when linked instances are on, and loads the links', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'power');

		const current = setup();
		await flushPromises();

		expect(current().showRunTargetPicker.value).toBe(true);
		expect(current().links.value).toEqual([link(OFFICE_ID, 'Office')]);
	});

	it('sends the chosen target only while the picker shows, so Simple mode starts here', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'power');
		const current = setup();
		await flushPromises();
		current().runTarget.value = { kind: 'linked', instanceId: OFFICE_ID };
		expect(current().chosenRunTarget.value).toEqual({ kind: 'linked', instanceId: OFFICE_ID });

		resetExperienceModeState();
		useExperience(['instance-ai', 'linked-instances'], 'simple');
		await nextTick();

		expect(current().showRunTargetPicker.value).toBe(false);
		expect(current().chosenRunTarget.value).toBeUndefined();
	});

	it('hides the picker and loads nothing when linked instances are off', async () => {
		useExperience(['instance-ai'], 'power');

		const current = setup();
		await flushPromises();

		expect(current().showRunTargetPicker.value).toBe(false);
		expect(fetchLinkedInstances).not.toHaveBeenCalled();
	});

	it('hides the picker in Simple mode', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'simple');

		const current = setup();
		await flushPromises();

		expect(current().showRunTargetPicker.value).toBe(false);
		expect(fetchLinkedInstances).not.toHaveBeenCalled();
	});

	it('starts on this computer, and keeps the choice while the list still holds the link', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'power');
		const current = setup();
		await flushPromises();

		current().runTarget.value = { kind: 'linked', instanceId: OFFICE_ID };
		await nextTick();

		expect(current().runTarget.value).toEqual({ kind: 'linked', instanceId: OFFICE_ID });
	});

	it('goes back to this computer when the chosen link is no longer listed', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'power');
		const current = setup();
		await flushPromises();
		current().runTarget.value = { kind: 'linked', instanceId: OFFICE_ID };

		vi.mocked(fetchLinkedInstances).mockResolvedValueOnce([]);
		useExperience(['instance-ai', 'linked-instances'], 'power');
		current().links.value = [];
		await nextTick();

		expect(current().runTarget.value).toEqual({ kind: 'local' });
	});

	it('offers this computer only when the list cannot be loaded', async () => {
		useExperience(['instance-ai', 'linked-instances'], 'power');
		vi.mocked(fetchLinkedInstances).mockRejectedValueOnce(new Error('offline'));

		const current = setup();
		await flushPromises();

		expect(current().links.value).toEqual([]);
		expect(current().showRunTargetPicker.value).toBe(true);
	});
});

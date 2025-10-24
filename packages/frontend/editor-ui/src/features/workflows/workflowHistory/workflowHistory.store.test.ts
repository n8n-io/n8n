import { createPinia, setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useWorkflowHistoryStore } from './workflowHistory.store';
import { useSettingsStore } from '@/stores/settings.store';

describe('Workflow history store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test.each([
		[true, 1, 1],
		[true, 2, 2],
		[false, 1, 2],
		[false, 2, 1],
		[false, -1, 2],
		[false, 2, -1],
	])(
		'should set `shouldUpgrade` to %s when pruneTime is %s and licensePruneTime is %s',
		(shouldUpgrade, pruneTime, licensePruneTime) => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const settingsStore = useSettingsStore();

			settingsStore.settings = {
				workflowHistory: {
					pruneTime,
					licensePruneTime,
				},
			} as FrontendSettings;

			expect(workflowHistoryStore.shouldUpgrade).toBe(shouldUpgrade);
		},
	);
});

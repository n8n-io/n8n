import { createPinia, setActivePinia } from 'pinia';
import type { IN8nUISettings } from 'n8n-workflow';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
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
			} as IN8nUISettings;

			expect(workflowHistoryStore.shouldUpgrade).toBe(shouldUpgrade);
		},
	);
});

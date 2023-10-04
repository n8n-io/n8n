import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useSettingsStore } from '@/stores/settings.store';
import {
	workflowHistoryDataFactory,
	workflowVersionDataFactory,
} from '@/stores/__tests__/utils/workflowHistoryTestUtils';

const historyData = Array.from({ length: 5 }, workflowHistoryDataFactory);
const versionData = {
	...workflowVersionDataFactory(),
	...historyData[0],
};

describe('Workflow history store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should reset data', () => {
		const workflowHistoryStore = useWorkflowHistoryStore();

		workflowHistoryStore.addWorkflowHistory(historyData);
		workflowHistoryStore.setActiveWorkflowVersion(versionData);

		expect(workflowHistoryStore.workflowHistory).toEqual(historyData);
		expect(workflowHistoryStore.activeWorkflowVersion).toEqual(versionData);

		workflowHistoryStore.reset();
		expect(workflowHistoryStore.workflowHistory).toEqual([]);
		expect(workflowHistoryStore.activeWorkflowVersion).toEqual(null);
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
			};

			expect(workflowHistoryStore.shouldUpgrade).toBe(shouldUpgrade);
		},
	);
});

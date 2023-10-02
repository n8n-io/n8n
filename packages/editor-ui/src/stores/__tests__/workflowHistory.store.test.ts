import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
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

	it('should set properties properly and reset', () => {
		const store = useWorkflowHistoryStore();

		store.addWorkflowHistory(historyData);
		store.setActiveWorkflowVersion(versionData);
		store.maxRetentionPeriod = 0;

		expect(store.shouldUpgrade).toBe(true);

		store.maxRetentionPeriod = 10;
		expect(store.shouldUpgrade).toBe(false);

		expect(store.workflowHistory).toEqual(historyData);
		expect(store.activeWorkflowVersion).toEqual(versionData);

		store.reset();
		expect(store.workflowHistory).toEqual([]);
		expect(store.activeWorkflowVersion).toEqual(null);
		expect(store.maxRetentionPeriod).toEqual(10);
	});
});

import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowHistoryStore } from './workflowHistory.store';

describe('Workflow history store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test('shouldUpgrade should always be false', () => {
		const workflowHistoryStore = useWorkflowHistoryStore();
		expect(workflowHistoryStore.shouldUpgrade).toBe(false);
	});
});

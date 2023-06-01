import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/stores';

let pinia: ReturnType<typeof createTestingPinia>;
beforeAll(() => {
	pinia = createTestingPinia();
});

describe('Workflows Store', () => {
	describe('shouldReplaceInputDataWithPinData', () => {
		beforeEach(() => {
			pinia.state.value = {
				workflows: useWorkflowsStore(),
			};
		});

		it('should return true if no active execution is set', () => {
			expect(useWorkflowsStore().shouldReplaceInputDataWithPinData).toBe(true);
		});

		it('should return true if active execution is set and mode is manual', () => {
			pinia.state.value.workflows.activeWorkflowExecution = { mode: 'manual' };
			expect(useWorkflowsStore().shouldReplaceInputDataWithPinData).toBe(true);
		});

		it('should return false if active execution is set and mode is not manual', () => {
			pinia.state.value.workflows.activeWorkflowExecution = { mode: 'webhook' };
			expect(useWorkflowsStore().shouldReplaceInputDataWithPinData).toBe(false);
		});
	});
});

import { shouldReplaceInputDataWithPinData } from '../workflowHelpers';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/stores';

// vi.mock('@/stores/useWorkflowsStore', () => ({
// 	useWorkflowsStore: vi.fn(() => ({
// 		activeWorkflowExecution: null,
// 	})),
// }));

let pinia: ReturnType<typeof createTestingPinia>;
beforeAll(() => {
	pinia = createTestingPinia();
});

describe('workflowHelpers', () => {
	describe('shouldReplaceInputDataWithPinData', () => {
		beforeEach(() => {
			pinia.state.value = {
				workflows: useWorkflowsStore(),
			};
		});

		it('should return true if no active execution is set', () => {
			const result = shouldReplaceInputDataWithPinData();
			expect(result).toBe(true);
		});

		it('should return true if active execution is set and mode is manual', async () => {
			pinia.state.value.workflows.activeWorkflowExecution = { mode: 'manual' };

			const result = shouldReplaceInputDataWithPinData();
			expect(result).toBe(true);
		});

		it('should return false if active execution is set and mode is not manual', async () => {
			pinia.state.value.workflows.activeWorkflowExecution = { mode: 'webhook' };

			const result = shouldReplaceInputDataWithPinData();
			expect(result).toBe(false);
		});
	});
});

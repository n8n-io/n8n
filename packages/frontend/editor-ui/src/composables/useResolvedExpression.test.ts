import { defineComponent, h, nextTick, ref, toValue } from 'vue';
import { useResolvedExpression } from './useResolvedExpression';
import { useWorkflowsStore } from '@/stores/workflows.store';
import * as workflowHelpers from './useWorkflowHelpers';
import { renderComponent } from '../__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { injectWorkflowState, useWorkflowState, type WorkflowState } from './useWorkflowState';

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

async function renderTestComponent(...options: Parameters<typeof useResolvedExpression>) {
	let resolvedExpression!: ReturnType<typeof useResolvedExpression>;

	const renderResult = renderComponent(
		defineComponent({
			setup() {
				resolvedExpression = useResolvedExpression(...options);
				return () => h('div');
			},
		}),
	);

	return { renderResult, ...resolvedExpression };
}

const mockResolveExpression = () => {
	const mock = vi.fn();
	vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockReturnValueOnce({
		...workflowHelpers.useWorkflowHelpers(),
		resolveExpression: mock,
	});

	return mock;
};

let workflowState: WorkflowState;

describe('useResolvedExpression', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.useFakeTimers();

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should resolve a simple expression', async () => {
		mockResolveExpression().mockReturnValue(4);
		const { isExpression, resolvedExpression, resolvedExpressionString } =
			await renderTestComponent({
				expression: '={{ testValue }}',
			});

		expect(toValue(isExpression)).toBe(true);
		expect(toValue(resolvedExpression)).toBe(4);
		expect(toValue(resolvedExpressionString)).toBe('4');
	});

	it('should return an empty string for non-expressions', async () => {
		const { isExpression, resolvedExpression, resolvedExpressionString } =
			await renderTestComponent({
				expression: 'test',
			});

		expect(toValue(isExpression)).toBe(false);
		expect(toValue(resolvedExpression)).toBe(null);
		expect(toValue(resolvedExpressionString)).toBe('');
	});

	it('should handle errors', async () => {
		mockResolveExpression().mockImplementation(() => {
			throw new Error('Test error');
		});
		const { isExpression, resolvedExpression, resolvedExpressionString } =
			await renderTestComponent({
				expression: '={{ testValue }}',
			});

		expect(toValue(isExpression)).toBe(true);
		expect(toValue(resolvedExpression)).toBe(null);
		expect(toValue(resolvedExpressionString)).toBe('[ERROR: Test error]');
	});

	it('should debounce updates', async () => {
		const resolveExpressionSpy = mockResolveExpression().mockReturnValue(4);
		const expression = ref('={{ testValue }}');

		await renderTestComponent({ expression });

		expect(resolveExpressionSpy).toHaveBeenCalledTimes(1);

		// Multiple fast updates should only resolve the expression once
		expression.value = '={{ testValue1 }}';
		expression.value = '={{ testValue2 }}';
		expression.value = '={{ testValue3 }}';
		await nextTick();

		expect(resolveExpressionSpy).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(200);
		expect(resolveExpressionSpy).toHaveBeenCalledTimes(2);
	});

	it('should re-resolve when workflow name changes', async () => {
		const workflowsStore = useWorkflowsStore();
		const resolveExpressionSpy = mockResolveExpression();
		resolveExpressionSpy.mockImplementation(() => workflowsStore.workflow.name);

		workflowState.setWorkflowName({ newName: 'Old Name', setStateDirty: false });

		const { resolvedExpressionString } = await renderTestComponent({
			expression: '={{ $workflow.name }}',
		});

		// Initial resolve
		vi.advanceTimersByTime(200);
		expect(toValue(resolvedExpressionString)).toBe('Old Name');

		// Update name and expect re-resolution
		workflowState.setWorkflowName({ newName: 'New Name', setStateDirty: false });
		await nextTick();
		vi.advanceTimersByTime(200);
		expect(toValue(resolvedExpressionString)).toBe('New Name');
	});
});

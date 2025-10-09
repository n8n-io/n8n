import { defineComponent, h, nextTick, ref, toValue } from 'vue';
import { useResolvedExpression } from './useResolvedExpression';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import { renderComponent } from '../__tests__/render';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

async function renderTestComponent(...options: Parameters<typeof useResolvedExpression>) {
	let resolvedExpression!: ReturnType<typeof useResolvedExpression>;

	const renderResult = renderComponent(
		defineComponent({
			setup() {
				resolvedExpression = useResolvedExpression(...options);
				return () => h('div');
			},
		}),
		{ props: { options } },
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

describe('useResolvedExpression', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
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
});

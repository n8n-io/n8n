import { defineComponent, h, nextTick, ref, toValue } from 'vue';
import { useResolvedExpression } from './useResolvedExpression';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import * as workflowHelpers from './useWorkflowHelpers';
import { renderComponent } from '@/__tests__/render';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createRunExecutionData } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

let mockActiveExecution: IExecutionResponse | null = null;

vi.mock('@/app/stores/workflowExecutionState.store', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		injectWorkflowExecutionStateStore: vi.fn(() => ({
			// Plain accessor (not `computed`) so per-test reassignment of the
			// non-reactive `mockActiveExecution` is always picked up.
			get value() {
				return {
					activeExecution: mockActiveExecution,
					activeExecutionRunData: mockActiveExecution?.data?.resultData.runData,
				};
			},
		})),
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

describe('useResolvedExpression', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockActiveExecution = null;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should resolve a simple expression', async () => {
		mockResolveExpression().mockResolvedValue(4);
		const { isExpression, resolvedExpression, resolvedExpressionString } =
			await renderTestComponent({
				expression: '={{ testValue }}',
			});

		await nextTick();
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
		mockResolveExpression().mockRejectedValue(new Error('Test error'));
		const { isExpression, resolvedExpression, resolvedExpressionString } =
			await renderTestComponent({
				expression: '={{ testValue }}',
			});

		await nextTick();
		expect(toValue(isExpression)).toBe(true);
		expect(toValue(resolvedExpression)).toBe(null);
		expect(toValue(resolvedExpressionString)).toBe('[ERROR: Test error]');
	});

	it('should defer transformed credential secret previews until execution', async () => {
		mockResolveExpression().mockResolvedValue(undefined);
		const { resolvedExpressionString } = await renderTestComponent({
			expression: "={{ JSON.parse($secrets.aws['preview-test']).password }}",
			isForCredential: true,
			additionalData: {
				$secrets: { aws: { 'preview-test': '*********' } },
			},
		});

		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe('[evaluated during execution]');
	});

	it('should not defer credential secret previews with an unknown secret reference', async () => {
		mockResolveExpression().mockResolvedValue(undefined);
		const { resolvedExpressionString } = await renderTestComponent({
			expression: "={{ JSON.parse($secrets.aws['name-with-typo']).password }}",
			isForCredential: true,
			additionalData: {
				$secrets: { aws: { 'preview-test': '*********' } },
			},
		});

		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe('[secret not found]');
	});

	const redactedExecution = (redactionInfo: Partial<{ canReveal: boolean; reason: string }> = {}) =>
		createTestWorkflowExecutionResponse({
			status: 'success',
			data: createRunExecutionData({
				redactionInfo: {
					isRedacted: true,
					reason: 'workflow_redaction_policy',
					canReveal: true,
					...redactionInfo,
				},
			}),
		});

	it('shows the reveal hint and flags redaction over redacted execution data', async () => {
		mockResolveExpression().mockResolvedValue(undefined);
		mockActiveExecution = redactedExecution();

		const { resolvedExpressionString, isRedacted } = await renderTestComponent({
			expression: '={{ $json.code }}',
		});

		await nextTick();
		expect(toValue(isRedacted)).toBe(true);
		expect(toValue(resolvedExpressionString)).toBe('Reveal data first to see value');
	});

	it('replaces a mixed expression that reads redacted data with the hint', async () => {
		mockResolveExpression().mockResolvedValue('Hello ');
		mockActiveExecution = redactedExecution();

		const { resolvedExpressionString, isRedacted } = await renderTestComponent({
			expression: '=Hello {{ $json.code }}',
		});

		await nextTick();
		expect(toValue(isRedacted)).toBe(true);
		expect(toValue(resolvedExpressionString)).toBe('Reveal data first to see value');
	});

	it('shows the fallback value instead of the hint for a single resolvable with a fallback', async () => {
		mockResolveExpression().mockResolvedValue('d');
		mockActiveExecution = redactedExecution();

		const { resolvedExpressionString, isRedacted } = await renderTestComponent({
			expression: "={{ $json.code ?? 'd' }}",
		});

		await nextTick();
		expect(toValue(isRedacted)).toBe(false);
		expect(toValue(resolvedExpressionString)).toBe('d');
	});

	it('does not flag redaction when the expression does not read execution data', async () => {
		mockResolveExpression().mockResolvedValue('resolved');
		mockActiveExecution = redactedExecution();

		const { resolvedExpressionString, isRedacted } = await renderTestComponent({
			expression: '={{ 1 + 1 }}',
		});

		await nextTick();
		expect(toValue(isRedacted)).toBe(false);
		expect(toValue(resolvedExpressionString)).toBe('resolved');
	});

	it('shows the no-permission text when the data cannot be revealed', async () => {
		mockResolveExpression().mockResolvedValue(undefined);
		mockActiveExecution = redactedExecution({ canReveal: false });

		const { resolvedExpressionString } = await renderTestComponent({
			expression: '={{ $json.code }}',
		});

		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe('No permission to reveal redacted data');
	});

	it('shows the dynamic-credentials text for end-user credential executions', async () => {
		mockResolveExpression().mockResolvedValue(undefined);
		mockActiveExecution = redactedExecution({ canReveal: false, reason: 'dynamic_credentials' });

		const { resolvedExpressionString } = await renderTestComponent({
			expression: '={{ $json.code }}',
		});

		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe("End-user credential data can't be revealed");
	});

	it('should debounce updates', async () => {
		const resolveExpressionSpy = mockResolveExpression().mockResolvedValue(4);
		const expression = ref('={{ testValue }}');

		await renderTestComponent({ expression });

		await nextTick();
		expect(resolveExpressionSpy).toHaveBeenCalledTimes(1);

		// Multiple fast updates should only resolve the expression once
		expression.value = '={{ testValue1 }}';
		expression.value = '={{ testValue2 }}';
		expression.value = '={{ testValue3 }}';
		await nextTick();

		expect(resolveExpressionSpy).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(200);
		await nextTick();
		expect(resolveExpressionSpy).toHaveBeenCalledTimes(2);
	});

	it('should re-resolve when workflow name changes', async () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-workflow');
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId('test-workflow'),
		);
		const resolveExpressionSpy = mockResolveExpression();
		resolveExpressionSpy.mockImplementation(async () => workflowDocumentStore.name);

		workflowDocumentStore.setName('Old Name');

		const { resolvedExpressionString } = await renderTestComponent({
			expression: '={{ $workflow.name }}',
		});

		// Initial resolve - need multiple nextTick calls to handle async resolution
		await nextTick();
		vi.advanceTimersByTime(200);
		await nextTick();
		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe('Old Name');

		// Update name and expect re-resolution
		workflowDocumentStore.setName('New Name');
		await nextTick();
		vi.advanceTimersByTime(200);
		await nextTick();
		await nextTick();
		expect(toValue(resolvedExpressionString)).toBe('New Name');
	});
});

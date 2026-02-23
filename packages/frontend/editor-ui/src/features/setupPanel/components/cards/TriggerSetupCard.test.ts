import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import TriggerSetupCard from '@/features/setupPanel/components/cards/TriggerSetupCard.vue';
import type { TriggerSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';

const { mockExecute, mockComposableState } = vi.hoisted(() => ({
	mockExecute: vi.fn(),
	mockComposableState: {
		isExecuting: false,
		isButtonDisabled: false,
		label: 'Test node',
		buttonIcon: 'flask-conical' as const,
		tooltipItems: [] as string[],
		isInListeningState: false,
		listeningHint: '',
	},
}));

vi.mock('@/features/setupPanel/composables/useTriggerExecution', async () => {
	const { computed } = await import('vue');
	return {
		useTriggerExecution: vi.fn(() => ({
			isExecuting: computed(() => mockComposableState.isExecuting),
			isButtonDisabled: computed(() => mockComposableState.isButtonDisabled),
			label: computed(() => mockComposableState.label),
			buttonIcon: computed(() => mockComposableState.buttonIcon),
			tooltipItems: computed(() => mockComposableState.tooltipItems),
			execute: mockExecute,
			isInListeningState: computed(() => mockComposableState.isInListeningState),
			listeningHint: computed(() => mockComposableState.listeningHint),
		})),
	};
});

const renderComponent = createComponentRenderer(TriggerSetupCard);

const createState = (overrides: Partial<TriggerSetupState> = {}): TriggerSetupState => {
	const node = createTestNode({
		name: 'Webhook Trigger',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
	}) as INodeUi;

	return {
		node,
		isComplete: false,
		...overrides,
	};
};

describe('TriggerSetupCard', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		mockExecute.mockClear();
		mockComposableState.isExecuting = false;
		mockComposableState.isButtonDisabled = false;
		mockComposableState.label = 'Test node';
		mockComposableState.buttonIcon = 'flask-conical';
		mockComposableState.tooltipItems = [];
		mockComposableState.isInListeningState = false;
		mockComposableState.listeningHint = '';
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.webhook',
				displayName: 'Webhook Trigger',
			}),
		);
	});

	describe('rendering', () => {
		it('should render node name in header', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-setup-card-header')).toHaveTextContent('Webhook Trigger');
		});

		it('should render test button when expanded', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
		});

		it('should not render content when collapsed', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			expect(queryByTestId('trigger-execute-button')).not.toBeInTheDocument();
		});
	});

	describe('expand/collapse', () => {
		it('should toggle expanded state when header is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('trigger-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[false]]);
		});

		it('should emit expand when clicking collapsed card header', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			await userEvent.click(getByTestId('trigger-setup-card-header'));

			expect(emitted('update:expanded')).toEqual([[true]]);
		});

		// Auto-collapse on completion and initial-collapse-if-complete
		// are handled by the parent (SetupPanelCards) which owns expanded state.
	});

	describe('complete state', () => {
		it('should show check icon in header when collapsed and complete', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('trigger-setup-card-complete-icon')).toBeInTheDocument();
		});

		it('should apply completed class when isComplete is true', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: true }), expanded: false },
			});

			expect(getByTestId('trigger-setup-card').className).toMatch(/completed/);
		});

		it('should not apply completed class when isComplete is false', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState({ isComplete: false }), expanded: false },
			});

			expect(getByTestId('trigger-setup-card').className).not.toMatch(/completed/);
		});
	});

	describe('test button', () => {
		it('should render test button when expanded', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-execute-button')).toBeInTheDocument();
		});

		it('should disable test button when isButtonDisabled is true', () => {
			mockComposableState.isButtonDisabled = true;

			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-execute-button')).toBeDisabled();
		});

		it('should disable test button when node is executing', () => {
			mockComposableState.isExecuting = true;

			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-execute-button')).toBeDisabled();
		});

		it('should enable test button when isButtonDisabled is false', () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(getByTestId('trigger-execute-button')).not.toBeDisabled();
		});
	});

	describe('test execution', () => {
		it('should call execute when test button is clicked', async () => {
			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			await userEvent.click(getByTestId('trigger-execute-button'));

			expect(mockExecute).toHaveBeenCalledTimes(1);
		});
	});

	describe('listening callout', () => {
		it('should show callout when in listening state', () => {
			mockComposableState.isInListeningState = true;
			mockComposableState.listeningHint = 'Waiting for you to call the Test URL';

			const { getByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			const callout = getByTestId('trigger-listening-callout');
			expect(callout).toBeInTheDocument();
			expect(callout).toHaveTextContent('Waiting for you to call the Test URL');
		});

		it('should not show callout when not in listening state', () => {
			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: true },
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});

		it('should not show callout when collapsed', () => {
			mockComposableState.isInListeningState = true;
			mockComposableState.listeningHint = 'Listening...';

			const { queryByTestId } = renderComponent({
				props: { state: createState(), expanded: false },
			});

			expect(queryByTestId('trigger-listening-callout')).not.toBeInTheDocument();
		});
	});
});

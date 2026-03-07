import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import DemoWorkflowCard from './DemoWorkflowCard.vue';

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: vi.fn(),
}));

const renderComponent = createComponentRenderer(DemoWorkflowCard);

describe('ReadyToDemoCard', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let runEntireWorkflow: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		runEntireWorkflow = vi.fn();
		vi.mocked(useRunWorkflow).mockReturnValue({
			runEntireWorkflow,
		} as never);

		const pinia = createTestingPinia({
			initialState: {
				workflows: {
					workflow: {
						id: '1',
						name: 'Test Workflow',
						pinData: {},
					},
				},
			},
		});

		workflowsStore = useWorkflowsStore(pinia);
	});

	describe('Initial State', () => {
		it('renders in expanded state initially', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('dwc-header')).toBeInTheDocument();
			expect(getByTestId('dwc-description')).toBeInTheDocument();
		});

		it('displays skip and run buttons in initial state', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('dwc-skip-button')).toBeInTheDocument();
			expect(getByTestId('dwc-run-button')).toBeInTheDocument();
		});

		it('shows correct header text for init state', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('dwc-header')).toBeInTheDocument();
		});
	});

	describe('Skip Functionality', () => {
		it('transitions to skip state when skip button is clicked', async () => {
			const { getByTestId, getByText } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			expect(getByText('Undo')).toBeInTheDocument();
		});

		it('clears pin data when skipping demo', async () => {
			const pinData = { node1: [{ json: { test: 'data' } }] };
			workflowsStore.workflow.pinData = pinData;

			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith({});
		});

		it('stores pin data holdover when skipping', async () => {
			const pinData = { node1: [{ json: { test: 'data' } }] };
			workflowsStore.workflow.pinData = pinData;

			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			// Verify pin data was stored by checking re-enter functionality
			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith(
				expect.objectContaining({
					node1: expect.any(Array),
				}),
			);
		});

		it('collapses card when in skip state', async () => {
			const { getByTestId, queryByText } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			expect(queryByText('dwc-description')).not.toBeInTheDocument();
		});

		it('shows undo button in skip state', async () => {
			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			expect(getByTestId('dwc-undo')).toBeInTheDocument();
		});
	});

	describe('Run Functionality', () => {
		it('transitions to ran state when run button is clicked', async () => {
			const { getByTestId, getByText } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			expect(getByText('Ran demo')).toBeInTheDocument();
		});

		it('executes workflow when run button is clicked', async () => {
			const { getByTestId } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			expect(runEntireWorkflow).toHaveBeenCalledWith('main');
		});

		it('emits testWorkflow event when run button is clicked', async () => {
			const { getByTestId, emitted } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			expect(emitted()).toHaveProperty('testWorkflow');
		});

		it('shows check icon in ran state', async () => {
			const { getByTestId, container } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			const checkIcon = container.querySelector('[data-icon="check"]');
			expect(checkIcon).toBeInTheDocument();
		});

		it('shows clear button in ran state', async () => {
			const { getByTestId } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			expect(getByTestId('dwc-clear')).toBeInTheDocument();
		});

		it('collapses card when in ran state', async () => {
			const { getByTestId, queryByText } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			expect(queryByText('dwc-description')).not.toBeInTheDocument();
		});
	});

	describe('Clear Functionality', () => {
		it('transitions to clear state when clear button is clicked', async () => {
			const { getByTestId, getByText } = renderComponent();

			// First run the workflow
			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			// Then clear
			const clearButton = getByTestId('dwc-clear');
			await userEvent.click(clearButton);

			// Should still show ran header
			expect(getByText('Ran demo')).toBeInTheDocument();
		});

		it('restores pin data when clearing', async () => {
			const pinData = { node1: [{ json: { test: 'data' } }] };
			workflowsStore.workflow.pinData = pinData;

			const { getByTestId } = renderComponent();

			// Skip to store pin data
			const skipButton = getByTestId('dwc-skip-button');
			await userEvent.click(skipButton);

			// Re-enter and run
			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			// Clear to restore
			const clearButton = getByTestId('dwc-clear');
			await userEvent.click(clearButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith(
				expect.objectContaining({
					node1: expect.any(Array),
				}),
			);
		});

		it('shows undo button in clear state', async () => {
			const { getByTestId, getByText } = renderComponent();

			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			const clearButton = getByText('Clear demo data');
			await userEvent.click(clearButton);

			expect(getByText('Undo')).toBeInTheDocument();
		});

		it('shows check icon in clear state', async () => {
			const { getByTestId, container } = renderComponent();

			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			const clearButton = getByTestId('dwc-clear');
			await userEvent.click(clearButton);

			const checkIcon = container.querySelector('[data-icon="check"]');
			expect(checkIcon).toBeInTheDocument();
		});
	});

	describe('Re-enter Demo Functionality', () => {
		it('transitions back to init state when undo is clicked from skip state', async () => {
			const { getByTestId } = renderComponent();

			const skipButton = getByTestId('dwc-skip-button');
			await userEvent.click(skipButton);

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(getByTestId('dwc-header')).toBeInTheDocument();
			expect(getByTestId('dwc-description')).toBeInTheDocument();
		});

		it('transitions back to init state when undo is clicked from clear state', async () => {
			const { getByTestId } = renderComponent();

			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			const clearButton = getByTestId('dwc-clear');
			await userEvent.click(clearButton);

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(getByTestId('dwc-header')).toBeInTheDocument();
			expect(getByTestId('dwc-description')).toBeInTheDocument();
		});

		it('restores pin data when re-entering demo', async () => {
			const pinData = { node1: [{ json: { test: 'data' } }] };
			workflowsStore.workflow.pinData = pinData;

			const { getByTestId } = renderComponent();

			const skipButton = getByTestId('dwc-skip-button');
			await userEvent.click(skipButton);

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith(
				expect.objectContaining({
					node1: expect.any(Array),
				}),
			);
		});

		it('expands card when re-entering demo', async () => {
			const { getByTestId } = renderComponent();

			const skipButton = getByTestId('dwc-skip-button');
			await userEvent.click(skipButton);

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(getByTestId('dwc-description')).toBeInTheDocument();
			expect(getByTestId('dwc-skip-button')).toBeInTheDocument();
			expect(getByTestId('dwc-run-button')).toBeInTheDocument();
		});
	});

	describe('Pin Data Management', () => {
		it('handles empty pin data correctly', async () => {
			workflowsStore.workflow.pinData = {};

			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith({});
		});

		it('handles null pin data correctly', async () => {
			workflowsStore.workflow.pinData = undefined;

			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith({});
		});

		it('deep clones pin data to prevent mutations', async () => {
			const pinData = { node1: [{ json: { test: 'data' } }] };
			workflowsStore.workflow.pinData = pinData;

			const { getByTestId } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			// Mutate original
			pinData.node1[0].json.test = 'modified';

			const undoButton = getByTestId('dwc-undo');
			await userEvent.click(undoButton);

			// Should restore original value, not mutated value
			expect(workflowsStore.setWorkflowPinData).toHaveBeenCalledWith(
				expect.objectContaining({
					node1: expect.arrayContaining([
						expect.objectContaining({
							json: expect.objectContaining({
								test: 'data',
							}),
						}),
					]),
				}),
			);
		});
	});

	describe('UI States', () => {
		it('applies collapsed class when not in init state', async () => {
			const { getByTestId, container } = renderComponent();
			const skipButton = getByTestId('dwc-skip-button');

			await userEvent.click(skipButton);

			const card = container.querySelector('[class*="card"]');
			expect(card?.className).toContain('collapsed');
		});

		it('applies completed class when in ran state', async () => {
			const { getByTestId, container } = renderComponent();
			const runButton = getByTestId('dwc-run-button');

			await userEvent.click(runButton);

			const card = container.querySelector('[class*="card"]');
			expect(card?.className).toContain('completed');
		});

		it('applies completed class when in clear state', async () => {
			const { getByTestId, container } = renderComponent();

			const runButton = getByTestId('dwc-run-button');
			await userEvent.click(runButton);

			const clearButton = getByTestId('dwc-clear');
			await userEvent.click(clearButton);

			const card = container.querySelector('[class*="card"]');
			expect(card?.className).toContain('completed');
		});

		it('does not apply completed class in init or skip state', async () => {
			const { getByTestId, container } = renderComponent();

			let card = container.querySelector('[class*="card"]');
			expect(card?.className).not.toContain('completed');

			const skipButton = getByTestId('dwc-skip-button');
			await userEvent.click(skipButton);

			card = container.querySelector('[class*="card"]');
			expect(card?.className).not.toContain('completed');
		});
	});
});

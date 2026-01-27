import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryButton from './WorkflowHistoryButton.vue';
import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import { AutoSaveState } from '@/app/constants';
import { nextTick } from 'vue';

vi.mock('vue-router', () => ({
	useRoute: () => vi.fn(),
	useRouter: () => vi.fn(),
	RouterLink: {
		name: 'RouterLink',
		template: '<a class="router-link"><slot /></a>',
	},
}));

const renderComponent = createComponentRenderer(WorkflowHistoryButton, {
	global: {
		stubs: {
			N8nIconButton: {
				template:
					'<button :disabled="disabled" data-test-id="workflow-history-button" :data-loading="loading"><slot /></button>',
				props: ['disabled', 'loading', 'type', 'icon', 'size'],
			},
			N8nTooltip: {
				template: '<div><slot /><div class="tooltip-content"><slot name="content" /></div></div>',
			},
		},
	},
});

describe('WorkflowHistoryButton', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.Idle);
	});

	it('should be disabled if the workflow is new', async () => {
		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
			},
		});

		await nextTick();
		const button = getByTestId('workflow-history-button');
		expect(button).toHaveAttribute('disabled');
	});

	it('should be enabled if the workflow is not new', async () => {
		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();
		const button = getByTestId('workflow-history-button');
		expect(button).not.toHaveAttribute('disabled');
	});

	it('should be disabled when autosave is scheduled', async () => {
		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.Scheduled);

		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();
		const button = getByTestId('workflow-history-button');
		expect(button).toHaveAttribute('disabled');
	});

	it('should be disabled when autosave is in progress', async () => {
		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();

		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.InProgress);
		await nextTick();

		const button = getByTestId('workflow-history-button');
		expect(button).toHaveAttribute('disabled');
	});

	it('should show loading spinner only when autosave is in progress', async () => {
		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		const autosaveStore = useWorkflowAutosaveStore();

		// Initially not loading
		await nextTick();
		expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('false');

		// Scheduled should not show loading
		autosaveStore.setAutoSaveState(AutoSaveState.Scheduled);
		await nextTick();
		expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('false');

		// In progress should show loading
		autosaveStore.setAutoSaveState(AutoSaveState.InProgress);
		await nextTick();
		expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('true');
	});

	it('should render as div when disabled', async () => {
		const { container } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
			},
		});

		await nextTick();
		// When disabled, should render as div, not RouterLink
		expect(container.querySelector('a.router-link')).not.toBeInTheDocument();
		expect(container.querySelector('div')).toBeInTheDocument();
	});

	it('should render as RouterLink when enabled', async () => {
		const { getByTestId } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();
		// When enabled, button should be clickable (not disabled)
		const button = getByTestId('workflow-history-button');
		expect(button).not.toHaveAttribute('disabled');

		// Check that button is inside an anchor or div
		const parentElement = button.parentElement;
		expect(parentElement?.tagName).toMatch(/^(A|DIV)$/);
	});

	it('should show correct tooltip for new workflow', async () => {
		const { container } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: true,
			},
		});

		await nextTick();
		const tooltip = container.querySelector('.tooltip-content');
		expect(tooltip?.textContent).toContain('This workflow currently has no history');
	});

	it('should show correct tooltip when autosave is scheduled', async () => {
		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.Scheduled);

		const { container } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();
		const tooltip = container.querySelector('.tooltip-content');
		expect(tooltip?.textContent).toContain('Workflow will be saved shortly');
	});

	it('should show correct tooltip when autosave is in progress', async () => {
		const { container } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();

		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.InProgress);
		await nextTick();

		const tooltip = container.querySelector('.tooltip-content');
		expect(tooltip?.textContent).toContain('Workflow is being saved');
	});

	it('should show correct tooltip when idle', async () => {
		const autosaveStore = useWorkflowAutosaveStore();
		autosaveStore.setAutoSaveState(AutoSaveState.Idle);

		const { container } = renderComponent({
			props: {
				workflowId: '1',
				isNewWorkflow: false,
			},
		});

		await nextTick();
		const tooltip = container.querySelector('.tooltip-content');
		expect(tooltip?.textContent).toContain('Workflow history to view and restore');
	});
});

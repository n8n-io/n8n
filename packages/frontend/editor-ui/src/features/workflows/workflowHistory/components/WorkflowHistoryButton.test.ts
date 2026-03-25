import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryButton from './WorkflowHistoryButton.vue';
import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
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
		const saveStore = useWorkflowSaveStore();
		saveStore.setAutoSaveState(AutoSaveState.Idle);
	});

	describe('button state', () => {
		it('should be disabled for new workflows', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: true },
			});
			await nextTick();
			expect(getByTestId('workflow-history-button')).toHaveAttribute('disabled');
		});

		it('should be enabled for existing workflows', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();
			expect(getByTestId('workflow-history-button')).not.toHaveAttribute('disabled');
		});

		it('should be disabled during autosave (scheduled and in progress)', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();

			const uiStore = useUIStore();
			const saveStore = useWorkflowSaveStore();

			// Autosave scheduled
			saveStore.setAutoSaveState(AutoSaveState.Scheduled);
			await nextTick();
			expect(getByTestId('workflow-history-button')).toHaveAttribute('disabled');

			// Autosave in progress
			saveStore.setAutoSaveState(AutoSaveState.InProgress);
			uiStore.addActiveAction('workflowSaving');
			await nextTick();
			expect(getByTestId('workflow-history-button')).toHaveAttribute('disabled');
		});

		it('should be disabled during manual save (e.g. rename)', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();

			const uiStore = useUIStore();
			uiStore.addActiveAction('workflowSaving');
			await nextTick();

			expect(getByTestId('workflow-history-button')).toHaveAttribute('disabled');
		});
	});

	describe('loading spinner', () => {
		it('should show loading only during active save, not when scheduled', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});

			const uiStore = useUIStore();
			const saveStore = useWorkflowSaveStore();

			// Initially not loading
			await nextTick();
			expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('false');

			// Scheduled - no loading spinner yet
			saveStore.setAutoSaveState(AutoSaveState.Scheduled);
			await nextTick();
			expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('false');

			// In progress - shows loading spinner
			uiStore.addActiveAction('workflowSaving');
			await nextTick();
			expect(getByTestId('workflow-history-button').getAttribute('data-loading')).toBe('true');
		});
	});

	describe('RouterLink rendering', () => {
		it('should render as div when disabled', async () => {
			const { container } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: true },
			});
			await nextTick();
			expect(container.querySelector('a.router-link')).not.toBeInTheDocument();
		});

		it('should render as RouterLink when enabled', async () => {
			const { getByTestId } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();
			expect(getByTestId('workflow-history-button')).not.toHaveAttribute('disabled');
		});
	});

	describe('tooltips', () => {
		it('should show "no history" tooltip for new workflows', async () => {
			const { container } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: true },
			});
			await nextTick();
			expect(container.querySelector('.tooltip-content')?.textContent).toContain(
				'This workflow currently has no history',
			);
		});

		it('should show "will be saved shortly" tooltip when scheduled', async () => {
			const saveStore = useWorkflowSaveStore();
			saveStore.setAutoSaveState(AutoSaveState.Scheduled);

			const { container } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();
			expect(container.querySelector('.tooltip-content')?.textContent).toContain(
				'Workflow will be saved shortly',
			);
		});

		it('should show "being saved" tooltip when save is in progress', async () => {
			const { container } = renderComponent({
				props: { workflowId: '1', isNewWorkflow: false },
			});
			await nextTick();

			const uiStore = useUIStore();
			uiStore.addActiveAction('workflowSaving');
			await nextTick();

			expect(container.querySelector('.tooltip-content')?.textContent).toContain(
				'Workflow is being saved',
			);
		});
	});
});

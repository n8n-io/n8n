import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { useUIStore } from '@/app/stores/ui.store';
import { ARCHIVE_WORKFLOWS_MODAL_KEY } from '@/app/constants';
import ArchiveWorkflowsModal from './ArchiveWorkflowsModal.vue';
import type { ArchiveWorkflowsModalMode } from './constants';

const workflow = (
	id: string,
	name: string,
	{ active = false, lastExecutedAt = undefined as Date | undefined } = {},
) => ({
	id,
	name,
	active,
	numberOfExecutions: 0,
	lastUpdatedAt: new Date('2024-01-15'),
	lastExecutedAt,
	status: 'wont_fix' as const,
	isArchived: false,
	issues: [],
});

let eventBus: EventBus;
const renderComponent = createComponentRenderer(ArchiveWorkflowsModal, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[ARCHIVE_WORKFLOWS_MODAL_KEY]: { open: true },
				},
			},
		},
	}),
	global: {
		stubs: {
			// Render the dialog body directly so it is queryable without the open-state portal.
			Dialog: { template: '<div role="dialog"><slot /></div>' },
			DialogHeader: { template: '<div><slot /></div>' },
			DialogTitle: { template: '<h2><slot /></h2>' },
			DialogFooter: { template: '<div><slot /></div>' },
		},
	},
});

function render(mode: ArchiveWorkflowsModalMode, workflows: Array<ReturnType<typeof workflow>>) {
	eventBus = createEventBus();
	return renderComponent({
		props: { modalName: ARCHIVE_WORKFLOWS_MODAL_KEY, data: { mode, workflows, eventBus } },
	});
}

describe('ArchiveWorkflowsModal', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('prompt', () => {
		it('should name the workflow and say that it will fail', () => {
			render('prompt', [workflow('workflow-1', 'Daily report')]);

			expect(screen.getByText("Archive 'Daily report' too?")).toBeInTheDocument();
			expect(screen.getByText(/so it'll fail after the upgrade to n8n 3.0/)).toBeInTheDocument();
			expect(screen.queryByText(/It's published/)).not.toBeInTheDocument();
			expect(screen.queryByTestId('archive-workflows-modal-list')).not.toBeInTheDocument();
		});

		it('should warn that archiving stops a published workflow', () => {
			render('prompt', [workflow('workflow-1', 'Daily report', { active: true })]);

			expect(screen.getByText(/It's published. Archiving stops it./)).toBeInTheDocument();
		});

		it('should send the workflow back on archive and close', async () => {
			const workflows = [workflow('workflow-1', 'Daily report')];
			render('prompt', workflows);
			const onConfirm = vi.fn();
			eventBus.on('confirm', onConfirm);

			await userEvent.click(screen.getByTestId('archive-workflows-modal-confirm-button'));

			expect(onConfirm).toHaveBeenCalledWith({ mode: 'prompt', workflows });
			expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(ARCHIVE_WORKFLOWS_MODAL_KEY);
		});

		it('should close without sending anything when the user keeps the workflow', async () => {
			render('prompt', [workflow('workflow-1', 'Daily report')]);
			const onConfirm = vi.fn();
			eventBus.on('confirm', onConfirm);

			await userEvent.click(screen.getByTestId('archive-workflows-modal-cancel-button'));

			expect(onConfirm).not.toHaveBeenCalled();
			expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(ARCHIVE_WORKFLOWS_MODAL_KEY);
		});
	});

	describe('confirm', () => {
		it('should show the count and list only the published workflows with their last run', () => {
			render('confirm', [
				workflow('workflow-1', 'Daily report', { active: true, lastExecutedAt: new Date() }),
				workflow('workflow-2', 'Old sync', { active: true }),
				workflow('workflow-3', 'Draft'),
			]);

			expect(
				screen.getByText("Mark 3 workflows as won't fix and archive them?"),
			).toBeInTheDocument();
			expect(screen.getByText(/2 of these workflows are published/)).toBeInTheDocument();
			const rows = within(screen.getByTestId('archive-workflows-modal-list')).getAllByRole(
				'listitem',
			);
			expect(rows).toHaveLength(2);
			expect(rows[0]).toHaveTextContent('Daily report');
			expect(rows[0]).toHaveTextContent('last run');
			expect(rows[1]).toHaveTextContent('Old sync');
			expect(rows[1]).toHaveTextContent('never run');
		});

		it('should list every published workflow of a large selection', () => {
			render(
				'confirm',
				Array.from({ length: 40 }, (_, i) =>
					workflow(`workflow-${i}`, `Workflow ${i}`, { active: true }),
				),
			);

			expect(
				within(screen.getByTestId('archive-workflows-modal-list')).getAllByRole('listitem'),
			).toHaveLength(40);
		});

		it('should send all selected workflows back on confirm', async () => {
			const workflows = [
				workflow('workflow-1', 'Daily report', { active: true }),
				workflow('workflow-2', 'Draft'),
			];
			render('confirm', workflows);
			const onConfirm = vi.fn();
			eventBus.on('confirm', onConfirm);

			await userEvent.click(screen.getByTestId('archive-workflows-modal-confirm-button'));

			expect(onConfirm).toHaveBeenCalledWith({ mode: 'confirm', workflows });
		});
	});
});

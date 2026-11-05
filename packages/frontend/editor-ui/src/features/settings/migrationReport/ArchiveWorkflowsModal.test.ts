import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ArchiveWorkflowsModal from './ArchiveWorkflowsModal.vue';
import { TARGET_VERSION_DISPLAY, type ArchiveWorkflowsModalMode } from './constants';

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

const renderComponent = createComponentRenderer(ArchiveWorkflowsModal, {
	// TimeAgo reads the locale from the root store.
	pinia: createTestingPinia(),
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
	return renderComponent({ props: { mode, workflows } });
}

describe('ArchiveWorkflowsModal', () => {
	describe('prompt', () => {
		it('should name the workflow and say that it will fail', () => {
			render('prompt', [workflow('workflow-1', 'Daily report')]);

			expect(screen.getByText("Archive 'Daily report' too?")).toBeInTheDocument();
			expect(
				screen.getByText(
					new RegExp(`so it'll fail after the upgrade to n8n ${TARGET_VERSION_DISPLAY}`),
				),
			).toBeInTheDocument();
			expect(screen.queryByText(/It's published/)).not.toBeInTheDocument();
			expect(screen.queryByTestId('archive-workflows-modal-list')).not.toBeInTheDocument();
		});

		it('should warn that archiving stops a published workflow', () => {
			render('prompt', [workflow('workflow-1', 'Daily report', { active: true })]);

			expect(screen.getByText(/It's published. Archiving stops it./)).toBeInTheDocument();
		});

		it('should confirm and close on archive', async () => {
			const { emitted } = render('prompt', [workflow('workflow-1', 'Daily report')]);

			await userEvent.click(screen.getByTestId('archive-workflows-modal-confirm-button'));

			expect(emitted()).toHaveProperty('confirm');
			expect(emitted()).toHaveProperty('close');
		});

		it('should close without confirming when the user keeps the workflow', async () => {
			const { emitted } = render('prompt', [workflow('workflow-1', 'Daily report')]);

			await userEvent.click(screen.getByTestId('archive-workflows-modal-cancel-button'));

			expect(emitted()).not.toHaveProperty('confirm');
			expect(emitted()).toHaveProperty('close');
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

		it('should label the confirm button with the bulk action', () => {
			render('confirm', [workflow('workflow-1', 'Daily report', { active: true })]);

			expect(screen.getByTestId('archive-workflows-modal-confirm-button')).toHaveTextContent(
				"Mark won't fix and archive",
			);
		});
	});
});

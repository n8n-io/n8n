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

const workflow = (id: string, name: string, lastExecutedAt?: Date) => ({
	id,
	name,
	active: false,
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

function render(workflows: Array<ReturnType<typeof workflow>>) {
	eventBus = createEventBus();
	return renderComponent({
		props: { modalName: ARCHIVE_WORKFLOWS_MODAL_KEY, data: { workflows, eventBus } },
	});
}

describe('ArchiveWorkflowsModal', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show the count and list every workflow with its last run', () => {
		render([
			workflow('workflow-1', 'Daily report', new Date()),
			workflow('workflow-2', 'Old sync'),
		]);

		expect(screen.getByText('Archive 2 workflows too?')).toBeInTheDocument();
		const rows = within(screen.getByTestId('archive-workflows-modal-list')).getAllByRole(
			'listitem',
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('Daily report');
		expect(rows[0]).toHaveTextContent('last run');
		expect(rows[1]).toHaveTextContent('Old sync');
		expect(rows[1]).toHaveTextContent('never run');
	});

	it('should list every workflow of a large selection', () => {
		render(Array.from({ length: 40 }, (_, i) => workflow(`workflow-${i}`, `Workflow ${i}`)));

		expect(screen.getByText('Archive 40 workflows too?')).toBeInTheDocument();
		expect(
			within(screen.getByTestId('archive-workflows-modal-list')).getAllByRole('listitem'),
		).toHaveLength(40);
	});

	it('should send the workflows to archive and close on confirm', async () => {
		const workflows = [workflow('workflow-1', 'Daily report')];
		render(workflows);
		const onArchive = vi.fn();
		eventBus.on('archive', onArchive);

		await userEvent.click(screen.getByTestId('archive-workflows-modal-archive-button'));

		expect(onArchive).toHaveBeenCalledWith({ workflows });
		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(ARCHIVE_WORKFLOWS_MODAL_KEY);
	});

	it('should close without archiving when the user keeps the workflows', async () => {
		render([workflow('workflow-1', 'Daily report')]);
		const onArchive = vi.fn();
		eventBus.on('archive', onArchive);

		await userEvent.click(screen.getByTestId('archive-workflows-modal-keep-button'));

		expect(onArchive).not.toHaveBeenCalled();
		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(ARCHIVE_WORKFLOWS_MODAL_KEY);
	});
});

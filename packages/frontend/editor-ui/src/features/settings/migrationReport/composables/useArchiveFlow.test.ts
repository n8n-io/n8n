import type { BreakingChangeRuleDetailResult } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useArchiveFlow } from './useArchiveFlow';
import { rowList, workflowRow } from '../__tests__/workflowRow';

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

type RuleImpact = BreakingChangeRuleDetailResult['ruleImpact'];

function setup(ruleImpact: RuleImpact = 'executionsFail', markWontFixResult = true) {
	const list = rowList([
		workflowRow({ id: 'published', active: true }),
		workflowRow({ id: 'draft', active: false }),
		workflowRow({ id: 'wont-fix', active: false, status: 'wont_fix' }),
	]);
	const markWontFix = vi.fn().mockResolvedValue(markWontFixResult);
	const onBulkArchiveStart = vi.fn();
	const flow = useArchiveFlow({
		ruleImpact: () => ruleImpact,
		updateRows: list.updateRows,
		stateOf: (workflow) => workflow.status,
		markWontFix,
		onBulkArchiveStart,
	});
	return { ...list, ...flow, markWontFix, onBulkArchiveStart };
}

describe('useArchiveFlow', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.archiveWorkflow.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('promptToArchive', () => {
		it('should open the prompt on a rule whose executions will fail', () => {
			const { rows, promptToArchive, archiveDialog } = setup('executionsFail');

			promptToArchive(rows.value[0]);

			expect(archiveDialog.value).toEqual({ mode: 'prompt', workflows: [rows.value[0]] });
		});

		it('should not open the prompt on other rules or for an archived workflow', () => {
			const other = setup('behaviorChanges');
			other.promptToArchive(other.rows.value[0]);

			const archived = setup('executionsFail');
			archived.promptToArchive(workflowRow({ isArchived: true }));

			expect(other.archiveDialog.value).toBeUndefined();
			expect(archived.archiveDialog.value).toBeUndefined();
		});

		it('should archive the workflow on confirm and close the dialog on close', async () => {
			const { rows, promptToArchive, onArchiveDialogConfirm, closeArchiveDialog, archiveDialog } =
				setup();

			promptToArchive(rows.value[0]);
			onArchiveDialogConfirm();
			closeArchiveDialog();

			await vi.waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'success', title: 'Archived 1 workflow' }),
				),
			);
			expect(workflowsStore.archiveWorkflow).toHaveBeenCalledExactlyOnceWith('published');
			expect(rows.value[0]).toMatchObject({ isArchived: true, active: false });
			expect(archiveDialog.value).toBeUndefined();
		});
	});

	describe('startBulkArchive', () => {
		it('should mark and archive at once when no workflow is published', async () => {
			const { rows, startBulkArchive, markWontFix, onBulkArchiveStart, archiveDialog } = setup();

			startBulkArchive(rows.value.slice(1));

			await vi.waitFor(() => expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(2));
			expect(archiveDialog.value).toBeUndefined();
			// The row that is already won't fix is archived but not marked again.
			expect(markWontFix).toHaveBeenCalledWith([expect.objectContaining({ id: 'draft' })]);
			expect(onBulkArchiveStart).toHaveBeenCalledWith(['draft', 'wont-fix']);
		});

		it('should ask first when a workflow is published, then mark and archive on confirm', async () => {
			const { rows, startBulkArchive, onArchiveDialogConfirm, markWontFix, archiveDialog } =
				setup();

			startBulkArchive(rows.value);

			expect(archiveDialog.value?.mode).toBe('confirm');
			expect(markWontFix).not.toHaveBeenCalled();

			onArchiveDialogConfirm();

			await vi.waitFor(() => expect(workflowsStore.archiveWorkflow).toHaveBeenCalledTimes(3));
			expect(markWontFix).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'published' }),
				expect.objectContaining({ id: 'draft' }),
			]);
		});

		it("should archive nothing when the won't fix save fails", async () => {
			const { rows, startBulkArchive, markWontFix, onBulkArchiveStart } = setup(
				'executionsFail',
				false,
			);

			startBulkArchive(rows.value.slice(1));

			await vi.waitFor(() => expect(markWontFix).toHaveBeenCalled());
			expect(onBulkArchiveStart).not.toHaveBeenCalled();
			expect(workflowsStore.archiveWorkflow).not.toHaveBeenCalled();
		});

		it('should report how many workflows it archived when some fail', async () => {
			workflowsStore.archiveWorkflow
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Forbidden'));
			const { rows, startBulkArchive } = setup();

			startBulkArchive(rows.value.slice(1));

			await vi.waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'warning', title: 'Archived 1 of 2 workflows' }),
				),
			);
			expect(rows.value[1].isArchived).toBe(true);
			expect(rows.value[2].isArchived).toBe(false);
		});

		it('should do nothing without workflows', () => {
			const { startBulkArchive, archiveDialog, markWontFix } = setup();

			startBulkArchive([]);

			expect(archiveDialog.value).toBeUndefined();
			expect(markWontFix).not.toHaveBeenCalled();
		});
	});
});

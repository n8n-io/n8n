import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useFindingTriage } from './useFindingTriage';
import { daysAgo, rowList, workflowRow } from '../__tests__/workflowRow';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	updateFindingStatus: vi.fn(),
	updateFindingStatuses: vi.fn(),
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

function setup(options: { busy?: boolean } = {}) {
	const notifiedAt = daysAgo(2);
	const list = rowList([
		workflowRow({ id: 'workflow-1', status: 'notified', notifiedAt }),
		workflowRow({ id: 'workflow-2' }),
	]);
	const onRowWontFix = vi.fn();
	const triage = useFindingTriage({
		ruleId: () => 'rule-1',
		updateRows: list.updateRows,
		isBusy: () => options.busy ?? false,
		onRowWontFix,
	});
	return { ...list, ...triage, onRowWontFix, notifiedAt };
}

describe('useFindingTriage', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('onFindingStatusChange', () => {
		it("should save the state and run the won't fix hook", async () => {
			vi.mocked(breakingChangesApi.updateFindingStatus).mockResolvedValue();
			const { rows, onFindingStatusChange, onRowWontFix } = setup();

			await onFindingStatusChange(rows.value[1], 'wont_fix');

			expect(rows.value[1].status).toBe('wont_fix');
			expect(breakingChangesApi.updateFindingStatus).toHaveBeenCalledWith(
				expect.anything(),
				'rule-1',
				'workflow-2',
				'wont_fix',
			);
			expect(onRowWontFix).toHaveBeenCalledWith(expect.objectContaining({ id: 'workflow-2' }));
		});

		it("should not run the won't fix hook on reopen", async () => {
			vi.mocked(breakingChangesApi.updateFindingStatus).mockResolvedValue();
			const { rows, onFindingStatusChange, onRowWontFix } = setup();

			await onFindingStatusChange(rows.value[0], 'open');

			expect(rows.value[0]).toMatchObject({ status: 'open', notifiedAt: undefined });
			expect(onRowWontFix).not.toHaveBeenCalled();
		});

		it('should change the row at once and mark it as saving until the request ends', async () => {
			let finish = () => {};
			vi.mocked(breakingChangesApi.updateFindingStatus).mockImplementation(
				async () => await new Promise<void>((resolve) => (finish = resolve)),
			);
			const { rows, onFindingStatusChange, savingWorkflowIds } = setup();

			const saving = onFindingStatusChange(rows.value[1], 'wont_fix');

			expect(rows.value[1].status).toBe('wont_fix');
			expect(savingWorkflowIds.value.has('workflow-2')).toBe(true);
			finish();
			await saving;
			expect(savingWorkflowIds.value.size).toBe(0);
		});

		it('should put the row back, notified date included, and show an error when the save fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(breakingChangesApi.updateFindingStatus).mockRejectedValue(error);
			const { rows, onFindingStatusChange, onRowWontFix, notifiedAt } = setup();

			await onFindingStatusChange(rows.value[0], 'open');

			expect(rows.value[0]).toMatchObject({ status: 'notified', notifiedAt });
			expect(showError).toHaveBeenCalledWith(error, 'Could not change the state');
			expect(onRowWontFix).not.toHaveBeenCalled();
		});

		it('should ignore a change to the same state or on a busy row', async () => {
			const unchanged = setup();
			await unchanged.onFindingStatusChange(unchanged.rows.value[1], 'open');

			const busy = setup({ busy: true });
			await busy.onFindingStatusChange(busy.rows.value[1], 'wont_fix');

			expect(breakingChangesApi.updateFindingStatus).not.toHaveBeenCalled();
			expect(busy.rows.value[1].status).toBe('open');
		});
	});

	describe('changeFindingStatuses', () => {
		it('should change all rows in one request', async () => {
			vi.mocked(breakingChangesApi.updateFindingStatuses).mockResolvedValue();
			const { rows, changeFindingStatuses, onRowWontFix } = setup();

			expect(await changeFindingStatuses(rows.value, 'wont_fix')).toBe(true);

			expect(rows.value.map((row) => row.status)).toEqual(['wont_fix', 'wont_fix']);
			expect(breakingChangesApi.updateFindingStatuses).toHaveBeenCalledWith(
				expect.anything(),
				'rule-1',
				['workflow-1', 'workflow-2'],
				'wont_fix',
			);
			expect(onRowWontFix).not.toHaveBeenCalled();
		});

		it('should drop the notified date on a bulk reopen', async () => {
			vi.mocked(breakingChangesApi.updateFindingStatuses).mockResolvedValue();
			const { rows, changeFindingStatuses } = setup();

			expect(await changeFindingStatuses([rows.value[0]], 'open')).toBe(true);

			expect(rows.value[0]).toMatchObject({ status: 'open', notifiedAt: undefined });
		});

		it('should put back the notified date when a bulk reopen fails', async () => {
			let fail = (_error: Error) => {};
			vi.mocked(breakingChangesApi.updateFindingStatuses).mockImplementation(
				async () => await new Promise<void>((_, reject) => (fail = reject)),
			);
			const { rows, changeFindingStatuses, notifiedAt } = setup();

			const reopening = changeFindingStatuses([rows.value[0]], 'open');
			expect(rows.value[0].notifiedAt).toBeUndefined();
			fail(new Error('Failed'));

			expect(await reopening).toBe(false);
			expect(rows.value[0]).toMatchObject({ status: 'notified', notifiedAt });
		});

		it('should put all rows back and return false when the request fails', async () => {
			vi.mocked(breakingChangesApi.updateFindingStatuses).mockRejectedValue(new Error('Failed'));
			const { rows, changeFindingStatuses, savingWorkflowIds } = setup();
			const before = rows.value;

			expect(await changeFindingStatuses(rows.value, 'wont_fix')).toBe(false);

			expect(rows.value).toEqual(before);
			expect(showError).toHaveBeenCalled();
			expect(savingWorkflowIds.value.size).toBe(0);
		});
	});
});

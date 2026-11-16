import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useOwnerNotify } from './useOwnerNotify';
import { owner, rowList, workflowRow } from '../__tests__/workflowRow';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	notifyFindingOwners: vi.fn(),
}));

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

const ada = owner('ada', { firstName: 'Ada', lastName: 'Lovelace' });

function setup(options: { busy?: boolean } = {}) {
	const list = rowList([
		workflowRow({ id: 'workflow-1', name: 'Invoices', owner: ada }),
		workflowRow({ id: 'workflow-2', owner: ada, status: 'fixed_unpublished' }),
		workflowRow({ id: 'workflow-3', owner: ada }),
	]);
	const notify = useOwnerNotify({
		ruleId: () => 'rule-1',
		updateRows: list.updateRows,
		isBusy: () => options.busy ?? false,
	});
	return { ...list, ...notify };
}

describe('useOwnerNotify', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('onNotify', () => {
		it('should mark the row as notified and name the owner in the success message', async () => {
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockResolvedValue({
				notifiedWorkflowIds: ['workflow-1'],
				skipped: [],
			});
			const { rows, onNotify } = setup();

			await onNotify(rows.value[0]);

			expect(breakingChangesApi.notifyFindingOwners).toHaveBeenCalledWith(
				expect.anything(),
				'rule-1',
				['workflow-1'],
			);
			expect(rows.value[0]).toMatchObject({ status: 'notified', notifiedAt: expect.any(Date) });
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
					message: expect.stringContaining('Ada Lovelace'),
				}),
			);
		});

		it.each([
			[
				'recently_notified',
				'The owner was notified less than a minute ago. Wait a minute before you send a reminder',
			],
			['send_failed', 'The email could not be sent. Check the SMTP settings of the instance'],
		] as const)(
			'should show the reason when the server skips the row: %s',
			async (reason, message) => {
				vi.mocked(breakingChangesApi.notifyFindingOwners).mockResolvedValue({
					notifiedWorkflowIds: [],
					skipped: [{ workflowId: 'workflow-1', reason }],
				});
				const { rows, onNotify } = setup();

				await onNotify(rows.value[0]);

				expect(rows.value[0].status).toBe('open');
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'error', message }),
				);
			},
		);

		it('should mark the row as notifying until the request ends', async () => {
			let finish = () => {};
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockImplementation(
				async () =>
					await new Promise((resolve) => {
						finish = () => resolve({ notifiedWorkflowIds: [], skipped: [] });
					}),
			);
			const { rows, onNotify, notifyingWorkflowIds } = setup();

			const notifying = onNotify(rows.value[0]);
			expect(notifyingWorkflowIds.value.has('workflow-1')).toBe(true);
			finish();
			await notifying;

			expect(notifyingWorkflowIds.value.size).toBe(0);
		});

		it('should show an error when the request fails', async () => {
			const error = new Error('Failed');
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockRejectedValue(error);
			const { rows, onNotify, notifyingWorkflowIds } = setup();

			await onNotify(rows.value[0]);

			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
			expect(rows.value[0].status).toBe('open');
			expect(notifyingWorkflowIds.value.size).toBe(0);
		});

		it('should not notify a busy row', async () => {
			const { rows, onNotify } = setup({ busy: true });

			await onNotify(rows.value[0]);

			expect(breakingChangesApi.notifyFindingOwners).not.toHaveBeenCalled();
		});
	});

	describe('notifyMany', () => {
		it('should report the count and return the notified ids', async () => {
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockResolvedValue({
				notifiedWorkflowIds: ['workflow-1', 'workflow-2'],
				skipped: [],
			});
			const { rows, notifyMany } = setup();

			expect(await notifyMany(rows.value.slice(0, 2))).toEqual(['workflow-1', 'workflow-2']);

			// A fix that is not published keeps its state.
			expect(rows.value.map((row) => row.status)).toEqual([
				'notified',
				'fixed_unpublished',
				'open',
			]);
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'success', title: expect.stringContaining('2') }),
			);
		});

		it('should warn with the skip reasons when the server skips some rows', async () => {
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockResolvedValue({
				notifiedWorkflowIds: ['workflow-1'],
				skipped: [{ workflowId: 'workflow-3', reason: 'no_owner' }],
			});
			const { rows, notifyMany } = setup();

			expect(await notifyMany([rows.value[0], rows.value[2]])).toEqual(['workflow-1']);

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					title: 'Notified owners of 1 of 2 workflows',
					message: 'The workflow has no owner with an email address',
				}),
			);
		});

		it('should return no ids when the request fails or nothing is selected', async () => {
			vi.mocked(breakingChangesApi.notifyFindingOwners).mockRejectedValue(new Error('Failed'));
			const { rows, notifyMany } = setup();

			expect(await notifyMany(rows.value)).toEqual([]);
			expect(await notifyMany([])).toEqual([]);
			expect(breakingChangesApi.notifyFindingOwners).toHaveBeenCalledTimes(1);
		});
	});
});

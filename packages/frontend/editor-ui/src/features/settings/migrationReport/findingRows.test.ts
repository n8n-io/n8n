import { withArchived, withNotified, withOwner, withRestored, withStatuses } from './findingRows';
import { daysAgo, owner, workflowRow } from './__tests__/workflowRow';

const notifiedAt = daysAgo(2);

describe('findingRows', () => {
	describe('withStatuses', () => {
		it('should set the status and keep the notified date', () => {
			const rows = [workflowRow({ status: 'notified', notifiedAt })];

			expect(withStatuses(rows, new Map([['workflow-1', 'wont_fix']]))).toEqual([
				workflowRow({ status: 'wont_fix', notifiedAt }),
			]);
		});

		it('should drop the notified date on reopen', () => {
			const rows = [workflowRow({ status: 'notified', notifiedAt })];

			const [row] = withStatuses(rows, new Map([['workflow-1', 'open']]));

			expect(row.status).toBe('open');
			expect(row.notifiedAt).toBeUndefined();
		});

		it('should keep the rows that it does not change', () => {
			const untouched = workflowRow({ id: 'workflow-2' });

			const result = withStatuses(
				[workflowRow(), untouched],
				new Map([['workflow-1', 'wont_fix']]),
			);

			expect(result[1]).toBe(untouched);
		});
	});

	it('should put back the previous rows, notified date included', () => {
		const previous = workflowRow({ status: 'notified', notifiedAt });
		const changed = workflowRow({ status: 'open' });
		const other = workflowRow({ id: 'workflow-2' });

		expect(withRestored([changed, other], [previous])).toEqual([previous, other]);
	});

	describe('withNotified', () => {
		it('should mark the notified rows with the date', () => {
			const rows = [workflowRow(), workflowRow({ id: 'workflow-2' })];

			const result = withNotified(rows, ['workflow-1'], notifiedAt);

			expect(result[0]).toMatchObject({ status: 'notified', notifiedAt });
			expect(result[1].status).toBe('open');
		});

		it('should keep a fix that is not published', () => {
			const rows = [workflowRow({ status: 'fixed_unpublished' })];

			expect(withNotified(rows, ['workflow-1'], notifiedAt)[0].status).toBe('fixed_unpublished');
		});
	});

	it('should mark archived rows as not published', () => {
		const rows = [workflowRow({ active: true }), workflowRow({ id: 'workflow-2', active: true })];

		const result = withArchived(rows, new Set(['workflow-1']));

		expect(result[0]).toMatchObject({ isArchived: true, active: false });
		expect(result[1]).toMatchObject({ isArchived: false, active: true });
	});

	it('should set and clear the owner of one row', () => {
		const ada = owner('user-1', { firstName: 'Ada' });
		const rows = [workflowRow(), workflowRow({ id: 'workflow-2' })];

		const assigned = withOwner(rows, 'workflow-1', ada);
		expect(assigned[0].owner).toEqual(ada);
		expect(assigned[1].owner).toBeUndefined();

		expect(withOwner(assigned, 'workflow-1', undefined)[0].owner).toBeUndefined();
	});
});

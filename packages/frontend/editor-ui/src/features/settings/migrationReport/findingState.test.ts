import {
	findingState,
	isBusy,
	isSelectable,
	isStale,
	isUnresolved,
	isUnresolvedState,
	withIds,
	type FindingState,
} from './findingState';
import { daysAgo, now, rowContext, workflowRow } from './__tests__/workflowRow';

describe('findingState', () => {
	it('should show the status of the row', () => {
		expect(findingState(workflowRow({ status: 'wont_fix' }), rowContext())).toBe('wont_fix');
	});

	it('should show a row migrated this session as migrated', () => {
		const context = rowContext({ migratedIds: new Set(['workflow-1']) });

		expect(findingState(workflowRow({ status: 'open' }), context)).toBe('migrated');
	});

	it.each<[FindingState, boolean]>([
		['open', true],
		['notified', true],
		['fixed_unpublished', true],
		['wont_fix', false],
		['migrated', false],
	])('should count %s as unresolved: %s', (state, unresolved) => {
		expect(isUnresolvedState(state)).toBe(unresolved);
	});

	it('should not count a migrated row as unresolved', () => {
		const context = rowContext({ migratedIds: new Set(['workflow-1']) });

		expect(isUnresolved(workflowRow({ status: 'open' }), context)).toBe(false);
	});

	it.each([
		['saving', rowContext({ savingIds: new Set(['workflow-1']) }), true],
		['notifying', rowContext({ notifyingIds: new Set(['workflow-1']) }), true],
		['idle', rowContext(), false],
	])('should mark a %s row as busy: %s', (_, context, busy) => {
		expect(isBusy(workflowRow(), context)).toBe(busy);
	});

	it('should not let a migrated row be selected', () => {
		const context = rowContext({ migratedIds: new Set(['workflow-1']) });

		expect(isSelectable(workflowRow(), context)).toBe(false);
		expect(isSelectable(workflowRow({ id: 'workflow-2' }), context)).toBe(true);
	});

	it.each([
		['ran 89 days ago', daysAgo(89), false],
		['ran 91 days ago', daysAgo(91), true],
		['never ran', undefined, false],
	])('should mark a workflow that %s as stale: %s', (_, lastExecutedAt, stale) => {
		expect(isStale(workflowRow({ lastExecutedAt }), now)).toBe(stale);
	});

	it('should add and remove ids without changing the original set', () => {
		const ids = new Set(['a', 'b']);

		expect([...withIds(ids, ['c'], true)]).toEqual(['a', 'b', 'c']);
		expect([...withIds(ids, ['a'], false)]).toEqual(['b']);
		expect([...ids]).toEqual(['a', 'b']);
	});
});

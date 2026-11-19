import {
	archiveTargets,
	canNotifyRow,
	findUnusedOpenWorkflows,
	needsArchiveConfirmation,
	notifyOwnerCount,
	notifyTargets,
	shouldPromptToArchive,
	statusChangeTargets,
} from './bulkTargets';
import { daysAgo, now, owner, rowContext, workflowRow } from './__tests__/workflowRow';

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);

describe('bulkTargets', () => {
	describe('statusChangeTargets', () => {
		const rows = [
			workflowRow({ id: 'open' }),
			workflowRow({ id: 'notified', status: 'notified' }),
			workflowRow({ id: 'wont-fix', status: 'wont_fix' }),
			workflowRow({ id: 'migrated' }),
			workflowRow({ id: 'saving' }),
		];
		const context = rowContext({
			migratedIds: new Set(['migrated']),
			savingIds: new Set(['saving']),
		});

		it("should change only the rows that are not already won't fix", () => {
			expect(ids(statusChangeTargets(rows, 'wont_fix', context))).toEqual(['open', 'notified']);
		});

		it('should count a notified row as changeable to open', () => {
			expect(ids(statusChangeTargets(rows, 'open', context))).toEqual(['notified', 'wont-fix']);
		});
	});

	it('should archive only rows that are selectable, idle, and not archived', () => {
		const rows = [
			workflowRow({ id: 'open' }),
			workflowRow({ id: 'wont-fix', status: 'wont_fix' }),
			workflowRow({ id: 'archived', isArchived: true }),
			workflowRow({ id: 'migrated' }),
			workflowRow({ id: 'notifying' }),
		];
		const context = rowContext({
			migratedIds: new Set(['migrated']),
			notifyingIds: new Set(['notifying']),
		});

		expect(ids(archiveTargets(rows, context))).toEqual(['open', 'wont-fix']);
	});

	it('should ask before an archive only when a workflow is published', () => {
		expect(needsArchiveConfirmation([workflowRow({ active: false })])).toBe(false);
		expect(
			needsArchiveConfirmation([workflowRow({ active: false }), workflowRow({ active: true })]),
		).toBe(true);
	});

	it.each([
		['executionsFail', false, true],
		['executionsFail', true, false],
		['behaviorChanges', false, false],
		['capabilityRemoved', false, false],
	] as const)(
		'on a %s rule, with archived %s, should prompt to archive: %s',
		(ruleImpact, isArchived, prompt) => {
			expect(shouldPromptToArchive(ruleImpact, workflowRow({ isArchived }))).toBe(prompt);
		},
	);

	describe('notify', () => {
		const ada = owner('ada');
		const rows = [
			workflowRow({ id: 'ada-1', owner: ada }),
			workflowRow({ id: 'ada-2', owner: ada, status: 'notified' }),
			workflowRow({ id: 'grace', owner: owner('grace') }),
			workflowRow({ id: 'no-email', owner: owner('noemail', { email: null }) }),
			workflowRow({ id: 'no-owner' }),
			workflowRow({ id: 'wont-fix', owner: ada, status: 'wont_fix' }),
			workflowRow({ id: 'busy', owner: ada }),
		];
		const context = rowContext({ notifyingIds: new Set(['busy']) });

		it('should notify only unresolved rows with an owner email', () => {
			expect(rows.map((row) => canNotifyRow(row, context, true))).toEqual([
				true,
				true,
				true,
				false,
				false,
				false,
				true,
			]);
		});

		it('should notify nobody without the permission or SMTP', () => {
			expect(canNotifyRow(rows[0], context, false)).toBe(false);
		});

		it('should leave busy rows out of a bulk notify', () => {
			expect(ids(notifyTargets(rows, context, true))).toEqual(['ada-1', 'ada-2', 'grace']);
		});

		it('should count one email per owner', () => {
			expect(notifyOwnerCount(notifyTargets(rows, context, true))).toBe(2);
		});
	});

	it('should find the open rows that did not run for 12 months', () => {
		const rows = [
			workflowRow({ id: 'unused', lastExecutedAt: daysAgo(400) }),
			workflowRow({ id: 'recent', lastExecutedAt: daysAgo(10) }),
			workflowRow({ id: 'never-ran', lastExecutedAt: undefined }),
			workflowRow({ id: 'wont-fix', status: 'wont_fix', lastExecutedAt: daysAgo(400) }),
			workflowRow({ id: 'migrated', lastExecutedAt: daysAgo(400) }),
			workflowRow({ id: 'saving', lastExecutedAt: daysAgo(400) }),
			workflowRow({ id: 'archived', isArchived: true, lastExecutedAt: daysAgo(400) }),
		];
		const context = rowContext({
			migratedIds: new Set(['migrated']),
			savingIds: new Set(['saving']),
		});

		expect(ids(findUnusedOpenWorkflows(rows, context, now))).toEqual(['unused']);
	});
});

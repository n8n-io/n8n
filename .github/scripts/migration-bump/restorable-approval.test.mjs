import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/migration-bump/restorable-approval.test.mjs
 * */

const PR_NUMBER = 42;
const APPROVED_SHA = 'approved-sha';
const BUMP_SHA = 'bump-sha';
const REVIEW_ID = 7;
const API_ERROR = 'Server Error';

const SIGNED_BUMP_COMMIT = {
	sha: BUMP_SHA,
	author: { login: 'n8n-assistant[bot]' },
	committer: { login: 'web-flow' },
	commit: { verification: { verified: true } },
};
const BUMP_CHANGES = {
	commits: [SIGNED_BUMP_COMMIT],
	files: [
		{
			status: 'renamed',
			previous_filename: 'packages/@n8n/db/src/migrations/common/1700000000000-New.ts',
			filename: 'packages/@n8n/db/src/migrations/common/1800000000000-New.ts',
			patch: '@@ -1 +1 @@\n-export class New1700000000000 {}\n+export class New1800000000000 {}',
		},
	],
};
const CODE_CHANGES = {
	commits: [{ ...SIGNED_BUMP_COMMIT, author: { login: 'poly' } }],
	files: [
		{ status: 'modified', filename: 'a.ts', patch: '@@ -1 +1 @@\n-const a = 1;\n+const a = 2;' },
	],
};

let reviews = [];
let events = [];
/** @type {() => Promise<any>} */
let changesBetween = async () => null;

mock.module('../github-helpers.mjs', {
	namedExports: {
		getPrReviews: async () => reviews,
		getPrEvents: async () => events,
		getChangesBetween: () => changesBetween(),
	},
});

const { hasRestorableApproval } = await import('./restorable-approval.mjs');

/** @param {string} login @param {string} state @param {number} [id] */
function review(login, state, id = REVIEW_ID) {
	return {
		id,
		user: { login },
		state,
		commit_id: APPROVED_SHA,
		submitted_at: '2026-01-01T00:00:00Z',
	};
}

/** @param {{ reviewId?: number, state?: string, dismissalCommitId?: string | null }} [dismissal] */
function dismissalEvent({
	reviewId = REVIEW_ID,
	state = 'approved',
	dismissalCommitId = BUMP_SHA,
} = {}) {
	return {
		event: 'review_dismissed',
		dismissed_review: { review_id: reviewId, state, dismissal_commit_id: dismissalCommitId },
	};
}

describe('hasRestorableApproval', () => {
	beforeEach(() => {
		reviews = [];
		events = [];
		changesBetween = async () => null;
	});

	it('is true when a reviewer approved', async () => {
		reviews = [review('poly', 'APPROVED')];

		assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), true);
	});

	it('is false when a reviewer requested changes', async () => {
		reviews = [review('poly', 'APPROVED', 1), review('ana', 'CHANGES_REQUESTED', 2)];

		assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
	});

	describe('a dismissed review', () => {
		beforeEach(() => {
			reviews = [review('poly', 'DISMISSED')];
			events = [dismissalEvent()];
		});

		it('counts when a bump push dismissed the approval and only bump commits follow it', async () => {
			changesBetween = async () => BUMP_CHANGES;

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), true);
		});

		it('does not count when a code commit follows the approval', async () => {
			changesBetween = async () => CODE_CHANGES;

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
		});

		it('does not count when it requested changes', async () => {
			events = [dismissalEvent({ state: 'changes_requested' })];
			changesBetween = async () => BUMP_CHANGES;

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
		});

		it('does not count when the approved commit is gone', async () => {
			changesBetween = async () => null;

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
		});

		it('does not count when a person dismissed the approval', async () => {
			changesBetween = async () => BUMP_CHANGES;

			for (const dismissalCommitId of [null, APPROVED_SHA]) {
				events = [dismissalEvent({ dismissalCommitId })];
				assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
			}
		});

		it('does not count through the dismissal event of another review', async () => {
			events = [dismissalEvent({ reviewId: REVIEW_ID + 1 })];
			changesBetween = async () => BUMP_CHANGES;

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
		});

		it('does not count when GitHub cannot compare the commits', async () => {
			changesBetween = async () => {
				throw Object.assign(new Error(API_ERROR), { status: 502 });
			};

			assert.equal(await hasRestorableApproval(PR_NUMBER, BUMP_SHA), false);
		});

		it('keeps the compare error text out of the run log', async () => {
			changesBetween = async () => {
				throw Object.assign(new Error(API_ERROR), { status: 502 });
			};
			const logged = [];
			const consoleLog = mock.method(console, 'log', (...args) => logged.push(args.join(' ')));

			await hasRestorableApproval(PR_NUMBER, BUMP_SHA);
			consoleLog.mock.restore();

			assert.deepEqual(
				logged.filter((line) => line.includes(API_ERROR)),
				[],
			);
		});
	});
});

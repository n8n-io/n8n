import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCallbackPayload } from './review-callback.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/ai-review/review-callback.test.mjs
 * */

const meta = () => ({
	prNumber: '123',
	headSha: 'b'.repeat(40),
	runId: '99887766',
	claudeOutcome: 'success',
});

describe('buildCallbackPayload', () => {
	it('wraps a validated review as a success payload', () => {
		const review = { schema_version: 1, verdict: 'looks_good', findings: [] };
		const payload = buildCallbackPayload(meta(), review, null);

		assert.equal(payload.success, true);
		assert.equal(payload.pr_number, 123);
		assert.equal(payload.head_sha, 'b'.repeat(40));
		assert.equal(payload.gh_run_id, '99887766');
		assert.deepEqual(payload.review, review);
		assert.equal(payload.error, null);
	});

	it('reports a failure payload when the review is missing', () => {
		const payload = buildCallbackPayload(meta(), null, 'validation failed: bad verdict');

		assert.equal(payload.success, false);
		assert.equal(payload.review, null);
		assert.equal(payload.error, 'validation failed: bad verdict');
	});

	it('treats a claude failure as unsuccessful even with review JSON present', () => {
		const review = { schema_version: 1, verdict: 'looks_good', findings: [] };
		const payload = buildCallbackPayload(
			{ ...meta(), claudeOutcome: 'failure' },
			review,
			null,
		);

		assert.equal(payload.success, false);
		assert.equal(payload.error, 'claude run failed');
		assert.deepEqual(payload.review, review);
	});
});

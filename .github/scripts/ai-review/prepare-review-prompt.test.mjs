import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewPrompt } from './prepare-review-prompt.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/ai-review/prepare-review-prompt.test.mjs
 * */

const baseArgs = () => ({
	prNumber: 12345,
	headSha: 'a'.repeat(40),
	outputPath: 'tmp/ai-review-12345.json',
	diffPath: 'tmp/ai-review-12345.diff',
	guidancePath: null,
	priorFindingsPath: null,
});

describe('buildReviewPrompt', () => {
	it('invokes the ai-pr-review skill with the PR and pinned paths', () => {
		const prompt = buildReviewPrompt(baseArgs());

		assert.ok(prompt.includes('/n8n:ai-pr-review'));
		assert.ok(prompt.includes('https://github.com/n8n-io/n8n/pull/12345'));
		assert.ok(prompt.includes('tmp/ai-review-12345.json'));
		assert.ok(prompt.includes('tmp/ai-review-12345.diff'));
		assert.ok(prompt.includes('a'.repeat(40)));
	});

	it('repeats the hard safety constraints', () => {
		const prompt = buildReviewPrompt(baseArgs());

		assert.match(prompt, /never approve/i);
		assert.match(prompt, /do not post/i);
	});

	it('omits guidance and prior-findings sections when not provided', () => {
		const prompt = buildReviewPrompt(baseArgs());

		assert.ok(!prompt.includes('guidance overlay'));
		assert.ok(!prompt.includes('prior findings'));
	});

	it('references the guidance file when provided', () => {
		const prompt = buildReviewPrompt({
			...baseArgs(),
			guidancePath: '/tmp/ai-review-guidance.md',
		});

		assert.ok(prompt.includes('guidance overlay'));
		assert.ok(prompt.includes('/tmp/ai-review-guidance.md'));
	});

	it('references the prior findings file when provided', () => {
		const prompt = buildReviewPrompt({
			...baseArgs(),
			priorFindingsPath: '/tmp/ai-review-prior-findings.json',
		});

		assert.ok(prompt.includes('prior findings'));
		assert.ok(prompt.includes('/tmp/ai-review-prior-findings.json'));
	});

	it('rejects a non-numeric PR number', () => {
		assert.throws(() => buildReviewPrompt({ ...baseArgs(), prNumber: '123; rm -rf /' }));
		assert.throws(() => buildReviewPrompt({ ...baseArgs(), prNumber: NaN }));
	});

	it('rejects a malformed head sha', () => {
		assert.throws(() => buildReviewPrompt({ ...baseArgs(), headSha: 'main' }));
		assert.throws(() => buildReviewPrompt({ ...baseArgs(), headSha: '' }));
	});
});

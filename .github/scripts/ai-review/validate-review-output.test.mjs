import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	parseUnifiedDiff,
	validateReviewOutput,
	VERDICTS,
	SEVERITIES,
	CATEGORIES,
} from './validate-review-output.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/ai-review/validate-review-output.test.mjs
 * */

const SAMPLE_DIFF = [
	'diff --git a/packages/cli/src/foo.ts b/packages/cli/src/foo.ts',
	'index 1111111..2222222 100644',
	'--- a/packages/cli/src/foo.ts',
	'+++ b/packages/cli/src/foo.ts',
	'@@ -10,5 +10,6 @@ export class Foo {',
	' context line 10',
	'-removed line 11',
	'+added line 11',
	'+added line 12',
	' context line 13',
	' context line 14',
	' context line 15',
	'@@ -30,3 +31,3 @@ export class Foo {',
	' context line 31',
	'-removed line 32',
	'+added line 32',
	' context line 33',
	'diff --git a/packages/cli/src/new-file.ts b/packages/cli/src/new-file.ts',
	'new file mode 100644',
	'index 0000000..3333333',
	'--- /dev/null',
	'+++ b/packages/cli/src/new-file.ts',
	'@@ -0,0 +1,2 @@',
	'+first line',
	'+second line',
].join('\n');

const validFinding = (overrides = {}) => ({
	id: 'f1',
	path: 'packages/cli/src/foo.ts',
	line: 11,
	side: 'RIGHT',
	start_line: null,
	severity: 'major',
	category: 'correctness',
	rule: 'security-review',
	confidence: 0.9,
	title: 'A finding',
	body_markdown: 'Something is wrong here.',
	carried_over: false,
	...overrides,
});

const validReview = (overrides = {}) => ({
	schema_version: 1,
	pr_number: 123,
	head_sha: 'a'.repeat(40),
	verdict: 'minor_issues',
	alignment: { matches_description: true, notes: '' },
	summary_markdown: 'Summary of the review.',
	findings: [validFinding()],
	...overrides,
});

describe('parseUnifiedDiff', () => {
	it('maps added and context lines to RIGHT-side line numbers', () => {
		const index = parseUnifiedDiff(SAMPLE_DIFF);
		const file = index.get('packages/cli/src/foo.ts');

		assert.ok(file);
		// hunk 1: +10,6 -> context 10, added 11, added 12, context 13, 14, 15
		for (const line of [10, 11, 12, 13, 14, 15]) {
			assert.ok(file.right.has(line), `expected RIGHT line ${line}`);
		}
		// hunk 2: +31,3 -> 31, 32, 33
		for (const line of [31, 32, 33]) {
			assert.ok(file.right.has(line), `expected RIGHT line ${line}`);
		}
		assert.ok(!file.right.has(16), 'line outside hunks is not commentable');
		assert.ok(!file.right.has(30), 'line between hunks is not commentable');
	});

	it('maps removed and context lines to LEFT-side line numbers', () => {
		const index = parseUnifiedDiff(SAMPLE_DIFF);
		const file = index.get('packages/cli/src/foo.ts');

		// hunk 1: -10,5 -> context 10, removed 11, context 12, 13, 14
		for (const line of [10, 11, 12, 13, 14]) {
			assert.ok(file.left.has(line), `expected LEFT line ${line}`);
		}
		assert.ok(!file.left.has(15), 'LEFT side ends at old-file hunk length');
	});

	it('indexes new files under their new path', () => {
		const index = parseUnifiedDiff(SAMPLE_DIFF);
		const file = index.get('packages/cli/src/new-file.ts');

		assert.ok(file);
		assert.ok(file.right.has(1));
		assert.ok(file.right.has(2));
		assert.equal(file.left.size, 0);
	});

	it('indexes renamed files under the new path', () => {
		const renameDiff = [
			'diff --git a/old/name.ts b/new/name.ts',
			'similarity index 90%',
			'rename from old/name.ts',
			'rename to new/name.ts',
			'--- a/old/name.ts',
			'+++ b/new/name.ts',
			'@@ -1,2 +1,2 @@',
			' unchanged',
			'-before',
			'+after',
		].join('\n');

		const index = parseUnifiedDiff(renameDiff);
		assert.ok(index.get('new/name.ts'));
		assert.equal(index.get('old/name.ts'), undefined);
		assert.ok(index.get('new/name.ts').right.has(2));
	});
});

describe('validateReviewOutput', () => {
	it('accepts a valid review and keeps anchored findings', () => {
		const result = validateReviewOutput(validReview(), parseUnifiedDiff(SAMPLE_DIFF));

		assert.deepEqual(result.errors, []);
		assert.equal(result.ok, true);
		assert.equal(result.review.findings.length, 1);
		assert.deepEqual(result.review.unanchored_findings, []);
	});

	it('rejects an unknown schema_version', () => {
		const result = validateReviewOutput(
			validReview({ schema_version: 2 }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.ok(result.errors.some((e) => e.includes('schema_version')));
	});

	it('rejects verdicts outside the enum, including approve', () => {
		for (const verdict of ['approve', 'APPROVE', 'lgtm', '']) {
			const result = validateReviewOutput(
				validReview({ verdict }),
				parseUnifiedDiff(SAMPLE_DIFF),
			);
			assert.equal(result.ok, false, `verdict "${verdict}" must be rejected`);
			assert.ok(result.errors.some((e) => e.includes('verdict')));
		}
	});

	it('exposes no approve-like verdict in the enum', () => {
		for (const verdict of VERDICTS) {
			assert.ok(!/approv/i.test(verdict), `verdict enum must not contain "${verdict}"`);
		}
	});

	it('rejects missing or empty summary_markdown', () => {
		const result = validateReviewOutput(
			validReview({ summary_markdown: '' }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.ok(result.errors.some((e) => e.includes('summary_markdown')));
	});

	it('rejects invalid severity, category, and confidence on findings', () => {
		const bad = [
			validFinding({ id: 'f1', severity: 'catastrophic' }),
			validFinding({ id: 'f2', category: 'vibes' }),
			validFinding({ id: 'f3', confidence: 1.5 }),
		];
		const result = validateReviewOutput(
			validReview({ findings: bad }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.equal(result.errors.length, 3);
	});

	it('rejects duplicate finding ids', () => {
		const result = validateReviewOutput(
			validReview({ findings: [validFinding(), validFinding()] }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.ok(result.errors.some((e) => e.includes('duplicate')));
	});

	it('defaults side to RIGHT and carried_over to false', () => {
		const finding = validFinding();
		delete finding.side;
		delete finding.carried_over;

		const result = validateReviewOutput(
			validReview({ findings: [finding] }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, true);
		assert.equal(result.review.findings[0].side, 'RIGHT');
		assert.equal(result.review.findings[0].carried_over, false);
	});

	it('demotes findings whose anchor is not in the diff instead of failing', () => {
		const findings = [
			validFinding({ id: 'ok' }),
			validFinding({ id: 'bad-line', line: 999 }),
			validFinding({ id: 'bad-path', path: 'packages/cli/src/other.ts' }),
		];
		const result = validateReviewOutput(
			validReview({ findings }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			result.review.findings.map((f) => f.id),
			['ok'],
		);
		assert.deepEqual(
			result.review.unanchored_findings.map((f) => f.id),
			['bad-line', 'bad-path'],
		);
	});

	it('accepts a LEFT-side anchor on a removed line', () => {
		const finding = validFinding({ side: 'LEFT', line: 11 });
		const result = validateReviewOutput(
			validReview({ findings: [finding] }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, true);
		assert.equal(result.review.findings.length, 1);
	});

	it('demotes a RIGHT-side anchor that only exists on the LEFT side', () => {
		// old-file hunk 1 covers LEFT lines 10-14; RIGHT line 16 exists nowhere
		const finding = validFinding({ side: 'LEFT', line: 15 });
		const result = validateReviewOutput(
			validReview({ findings: [finding] }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, true);
		assert.equal(result.review.findings.length, 0);
		assert.equal(result.review.unanchored_findings.length, 1);
	});

	it('rejects a multi-line comment range where start_line is not before line', () => {
		const finding = validFinding({ start_line: 13, line: 11 });
		const result = validateReviewOutput(
			validReview({ findings: [finding] }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.ok(result.errors.some((e) => e.includes('start_line')));
	});

	it('rejects a head_sha that is not a git sha', () => {
		const result = validateReviewOutput(
			validReview({ head_sha: 'not-a-sha' }),
			parseUnifiedDiff(SAMPLE_DIFF),
		);

		assert.equal(result.ok, false);
		assert.ok(result.errors.some((e) => e.includes('head_sha')));
	});

	it('exports the enums the skill documents', () => {
		assert.ok(VERDICTS.includes('looks_good'));
		assert.ok(VERDICTS.includes('insufficient_context'));
		assert.ok(SEVERITIES.includes('blocker'));
		assert.ok(CATEGORIES.includes('security'));
	});
});

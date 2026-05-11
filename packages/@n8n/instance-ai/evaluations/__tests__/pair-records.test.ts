import { pairRecords, promptJoinKey } from '../cli/compare-pairwise';
import type { BuilderRecord, FeedbackEntry } from '../cli/compare-pairwise';

const buildRecord = (overrides: Partial<BuilderRecord> = {}): BuilderRecord => ({
	prompt: 'Build a workflow',
	workflow: { name: 'wf' },
	durationMs: 100,
	success: true,
	feedback: [],
	...overrides,
});

const passFeedback = (): FeedbackEntry[] => [{ metric: 'pairwise_primary', score: 1 }];
const failFeedback = (): FeedbackEntry[] => [{ metric: 'pairwise_primary', score: 0 }];

// ---------------------------------------------------------------------------
// promptJoinKey
// ---------------------------------------------------------------------------

describe('promptJoinKey', () => {
	it('collapses whitespace and trims', () => {
		expect(promptJoinKey('  build\n a  workflow\t')).toBe('build a workflow');
	});

	it('treats CRLF and LF as equivalent', () => {
		expect(promptJoinKey('a\r\nb')).toBe(promptJoinKey('a\nb'));
	});

	it('matches identical content with different indentation', () => {
		const a = 'Step 1\n\tStep 2';
		const b = 'Step 1   Step 2';
		expect(promptJoinKey(a)).toBe(promptJoinKey(b));
	});
});

// ---------------------------------------------------------------------------
// pairRecords verdict matrix
// ---------------------------------------------------------------------------

describe('pairRecords', () => {
	it('produces a both-pass verdict when both builders pass primary', () => {
		const ee = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		const ia = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		const rows = pairRecords(ee, ia);
		expect(rows).toHaveLength(1);
		expect(rows[0].verdict).toBe('both-pass');
	});

	it('produces a both-fail verdict when neither builder passes', () => {
		const ee = [buildRecord({ prompt: 'A', feedback: failFeedback() })];
		const ia = [buildRecord({ prompt: 'A', feedback: failFeedback() })];
		expect(pairRecords(ee, ia)[0].verdict).toBe('both-fail');
	});

	it('produces an ee-only verdict when only EE passes', () => {
		const ee = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		const ia = [buildRecord({ prompt: 'A', feedback: failFeedback() })];
		expect(pairRecords(ee, ia)[0].verdict).toBe('ee-only');
	});

	it('produces an ia-only verdict when only IA passes', () => {
		const ee = [buildRecord({ prompt: 'A', feedback: failFeedback() })];
		const ia = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		expect(pairRecords(ee, ia)[0].verdict).toBe('ia-only');
	});

	it('counts a build failure as a fail in the verdict', () => {
		const ee = [
			buildRecord({ prompt: 'A', success: false, errorClass: 'build_timeout', feedback: [] }),
		];
		const ia = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		expect(pairRecords(ee, ia)[0].verdict).toBe('ia-only');
	});

	it('counts a built-but-unscored row (success=true, no primary feedback) as fail', () => {
		const ee = [buildRecord({ prompt: 'A', success: true, feedback: [] })];
		const ia = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		expect(pairRecords(ee, ia)[0].verdict).toBe('ia-only');
	});

	it('joins records whose prompts differ only in whitespace', () => {
		const ee = [buildRecord({ prompt: 'A B', feedback: passFeedback() })];
		const ia = [buildRecord({ prompt: ' A   B \n', feedback: passFeedback() })];
		const rows = pairRecords(ee, ia);
		expect(rows).toHaveLength(1);
		expect(rows[0].ee).toBe(ee[0]);
		expect(rows[0].ia).toBe(ia[0]);
		expect(rows[0].verdict).toBe('both-pass');
	});

	it('keeps unmatched rows with the missing-side undefined', () => {
		const ee = [buildRecord({ prompt: 'A', feedback: passFeedback() })];
		const ia = [buildRecord({ prompt: 'B', feedback: passFeedback() })];
		const rows = pairRecords(ee, ia);
		expect(rows).toHaveLength(2);
		const a = rows.find((r) => r.prompt === 'A');
		const b = rows.find((r) => r.prompt === 'B');
		expect(a?.ee).toBeDefined();
		expect(a?.ia).toBeUndefined();
		expect(b?.ee).toBeUndefined();
		expect(b?.ia).toBeDefined();
	});

	it('prefers IA criteria when both are present', () => {
		const ee = [buildRecord({ prompt: 'A', dos: 'ee-do', donts: 'ee-dont' })];
		const ia = [buildRecord({ prompt: 'A', dos: 'ia-do', donts: 'ia-dont' })];
		const row = pairRecords(ee, ia)[0];
		expect(row.dos).toBe('ia-do');
		expect(row.donts).toBe('ia-dont');
	});

	it('orders rows: ee-only, ia-only, both-fail, both-pass', () => {
		const ee = [
			buildRecord({ prompt: 'pass-pass', feedback: passFeedback() }),
			buildRecord({ prompt: 'ee-only', feedback: passFeedback() }),
			buildRecord({ prompt: 'both-fail', feedback: failFeedback() }),
			buildRecord({ prompt: 'ia-only', feedback: failFeedback() }),
		];
		const ia = [
			buildRecord({ prompt: 'pass-pass', feedback: passFeedback() }),
			buildRecord({ prompt: 'ee-only', feedback: failFeedback() }),
			buildRecord({ prompt: 'both-fail', feedback: failFeedback() }),
			buildRecord({ prompt: 'ia-only', feedback: passFeedback() }),
		];
		const verdicts = pairRecords(ee, ia).map((r) => r.verdict);
		expect(verdicts).toEqual(['ee-only', 'ia-only', 'both-fail', 'both-pass']);
	});
});

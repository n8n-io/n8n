import { loadAgentEvalTestCasesWithFiles } from '../data/agents';
import { loadNaturalAgentEvalTestCasesWithFiles } from '../data/agents-natural';

describe('agents-natural dataset', () => {
	const cases = loadNaturalAgentEvalTestCasesWithFiles();

	it('loads and schema-validates every case file', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	it('grades routing via expectations only — no intentExpectation, no exam preamble', () => {
		for (const { testCase, fileSlug } of cases) {
			expect(testCase.datasets, fileSlug).toContain('agents-natural');
			expect(testCase.intentExpectation, fileSlug).toBeUndefined();
			expect(testCase.processExpectations?.length ?? 0, fileSlug).toBeGreaterThan(0);
			// The natural arm sends the utterance raw — the exam preamble must never leak in.
			const firstTurn = testCase.conversation?.[0]?.text ?? '';
			expect(firstTurn, fileSlug).not.toContain('classify the intent');
			expect(firstTurn, fileSlug).not.toContain('```intent');
		}
	});

	// Spec buckets whose natural-arm conversation shape structurally cannot mirror
	// an exam case, with the reason. Every entry must exist (guarded below) so the
	// list can't go stale.
	const NO_EXAM_SIBLING: ReadonlyMap<string, string> = new Map([
		[
			'nat-ctx-live-wf-schedule-edit',
			'context continuity needs a real prior build in turn 1; the exam fakes it with priorConversation text',
		],
		[
			'nat-ops-data-table-question',
			'ops routing (skill: "not classified at all") has no exam-corpus counterpart',
		],
	]);

	it('every case pairs with an exam sibling by slug (nat-<slug>), keeping the arms comparable', () => {
		const examSlugs = new Set(loadAgentEvalTestCasesWithFiles().map((c) => c.fileSlug));
		const slugs = new Set(cases.map((c) => c.fileSlug));
		for (const exempt of NO_EXAM_SIBLING.keys()) {
			expect(slugs.has(exempt), `stale exemption: ${exempt}`).toBe(true);
		}
		for (const { fileSlug } of cases) {
			if (NO_EXAM_SIBLING.has(fileSlug)) continue;
			const sibling = fileSlug.replace(/^nat-/, '');
			expect(fileSlug, fileSlug).toMatch(/^nat-/);
			expect(examSlugs.has(sibling), `${fileSlug} → ${sibling}`).toBe(true);
		}
	});

	it('uses the same opening utterance as its exam sibling', () => {
		const examBySlug = new Map(
			loadAgentEvalTestCasesWithFiles().map((c) => [c.fileSlug, c.testCase]),
		);
		for (const { testCase, fileSlug } of cases) {
			if (NO_EXAM_SIBLING.has(fileSlug)) continue;
			const sibling = examBySlug.get(fileSlug.replace(/^nat-/, ''));
			if (!sibling) continue; // covered by the pairing test above
			// The exam loader prepends its preamble to turn 0 — the natural utterance
			// must be its exact suffix for the A/B pairing to stay honest.
			const examFirstTurn = sibling.conversation?.[0]?.text ?? '';
			const naturalFirstTurn = testCase.conversation?.[0]?.text ?? '';
			expect(examFirstTurn.endsWith(naturalFirstTurn), fileSlug).toBe(true);
		}
	});
});

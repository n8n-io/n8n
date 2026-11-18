import { scoreDraft, type ReplayedRun } from '../determinism-score';

const agentRun = (overrides: Partial<ReplayedRun> = {}): ReplayedRun => ({
	recorded: { llmDecided: 3, codeDecided: 0 },
	draft: { llmDecided: 1, codeDecided: 3 },
	matched: true,
	recordedTokens: 1000,
	draftTokens: 200,
	...overrides,
});

describe('scoreDraft', () => {
	it('scores the draft share for an agent when every run matches', () => {
		const result = scoreDraft(
			[agentRun(), agentRun(), agentRun(), agentRun(), agentRun()],
			20,
			0.8,
		);

		expect(result).toMatchObject({
			baselinePct: 0,
			effectivePct: 75,
			gainPoints: 75,
			matchRate: 1,
			showCta: true,
		});
	});

	it('shows no badge with fewer than 5 held-out runs, even when all match', () => {
		const result = scoreDraft([agentRun(), agentRun(), agentRun(), agentRun()], 20, 0.8);

		expect(result).toMatchObject({ matchRate: 1, showCta: false });
	});

	it('counts an unmatched run at its baseline', () => {
		const runs = [agentRun(), agentRun(), agentRun(), agentRun({ matched: false })];

		expect(scoreDraft(runs, 20, 1)).toMatchObject({ effectivePct: 56, matchRate: 0.75 });
	});

	it('averages the recorded shares as the baseline for a workflow', () => {
		const runs = [
			agentRun({ recorded: { llmDecided: 2, codeDecided: 2 } }),
			agentRun({ recorded: { llmDecided: 3, codeDecided: 1 } }),
		];

		expect(scoreDraft(runs, 20, 1)).toMatchObject({ baselinePct: 38, gainPoints: 38 });
	});

	it.each([
		[
			'the match rate is below 90%',
			10,
			20,
			[true, true, true, true, true, true, true, true, false, false],
		],
		['fewer than 20 runs were analysed', 4, 19, [true, true, true, true]],
	])('shows no call to action when %s', (_, count, totalRuns, matches) => {
		const runs = Array.from({ length: count }, (__, index) =>
			agentRun({ matched: matches[index] }),
		);

		expect(scoreDraft(runs, totalRuns, 1).showCta).toBe(false);
	});

	it('shows no call to action when the gain is below 20 points', () => {
		const runs = [agentRun({ draft: { llmDecided: 9, codeDecided: 1 } })];

		expect(scoreDraft(runs, 20, 1)).toMatchObject({ gainPoints: 10, showCta: false });
	});

	it('returns zeros and no call to action for an empty holdout', () => {
		expect(scoreDraft([], 20, 1)).toMatchObject({
			effectivePct: 0,
			gainPoints: 0,
			matchRate: 0,
			showCta: false,
		});
	});

	it('returns no token delta when a run has no token count', () => {
		const runs = [agentRun(), agentRun({ draftTokens: null })];

		expect(scoreDraft(runs, 20, 1).tokenDelta).toBeNull();
	});
});

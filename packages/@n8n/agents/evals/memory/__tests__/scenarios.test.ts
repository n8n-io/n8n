import { memoryGoldenScenarios } from '../scenarios';

const expectedTurnCounts = new Map([
	['coherent-long-thread', 50],
	['distractor-noisy-thread', 50],
	['correction-heavy-thread', 40],
	['similar-distinct-cases', 40],
	['privacy-redaction-boundaries', 30],
	['unadopted-assistant-proposal-noise', 30],
	['completion-open-loop-lifecycle', 40],
	['exact-artifact-inventory', 40],
	['tool-evidence-grounding', 30],
	['floating-message-window-cliff', 50],
]);

describe('memory golden scenarios', () => {
	it('matches the half-size golden benchmark shape', () => {
		expect(memoryGoldenScenarios.map((scenario) => scenario.id)).toEqual([
			'coherent-long-thread',
			'distractor-noisy-thread',
			'correction-heavy-thread',
			'similar-distinct-cases',
			'privacy-redaction-boundaries',
			'unadopted-assistant-proposal-noise',
			'completion-open-loop-lifecycle',
			'exact-artifact-inventory',
			'tool-evidence-grounding',
			'floating-message-window-cliff',
		]);

		for (const scenario of memoryGoldenScenarios) {
			const expectedTurnCount = expectedTurnCounts.get(scenario.id);
			if (expectedTurnCount === undefined) {
				throw new Error(`No expected turn count for scenario ${scenario.id}.`);
			}
			expect(scenario.turns).toHaveLength(expectedTurnCount);
			expect(scenario.oracle.activeFacts.length).toBeGreaterThan(0);
			expect(scenario.finalQuestions.length).toBeGreaterThan(0);
		}
	});
});

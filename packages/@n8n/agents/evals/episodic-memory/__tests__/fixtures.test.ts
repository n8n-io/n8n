import { episodicMemoryScenarios } from '../fixtures';

describe('episodic memory golden fixtures', () => {
	it('keeps every golden scenario in the long-thread range', () => {
		for (const scenario of episodicMemoryScenarios) {
			const setupTurns = [...scenario.threads, ...(scenario.isolatedThreads ?? [])].reduce(
				(total, thread) => total + thread.prompts.length,
				0,
			);

			expect(setupTurns).toBeGreaterThanOrEqual(40);
			expect(setupTurns).toBeLessThanOrEqual(60);
		}
	});
});

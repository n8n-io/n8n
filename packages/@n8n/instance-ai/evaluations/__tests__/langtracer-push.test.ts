import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { planPush } from '../langtracer/push';

function item(fileSlug: string, overrides: Record<string, unknown> = {}): WorkflowTestCaseWithFile {
	return {
		fileSlug,
		testCase: {
			conversation: [{ role: 'user', text: 'build a thing' }],
			complexity: 'simple',
			tags: ['build'],
			datasets: ['full'],
			...overrides,
		},
	} as WorkflowTestCaseWithFile;
}

/** A disk-shape exported body (what `GET /suites/:id/export` returns per case). */
function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		conversation: [{ role: 'user', text: 'build a thing' }],
		complexity: 'simple',
		tags: ['build'],
		datasets: ['full'],
		...overrides,
	};
}

describe('planPush', () => {
	it('creates a case whose slug is not yet in the suite', () => {
		const plan = planPush([item('new-case')], {}, {});
		expect(plan.toCreate.map((c) => c.fileSlug)).toEqual(['new-case']);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.unchanged).toEqual([]);
		expect(plan.skipped).toEqual([]);
	});

	it('reports an identical case as unchanged', () => {
		const plan = planPush([item('c')], { 'c.json': body() }, { c: 5 });
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toCreate).toEqual([]);
		expect(plan.toUpdate).toEqual([]);
	});

	it('updates a changed case and carries its existing id', () => {
		const plan = planPush(
			[item('c', { outcomeExpectations: ['a new expectation'] })],
			{ 'c.json': body() },
			{ c: 5 },
		);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.toUpdate[0].id).toBe(5);
		expect(plan.toUpdate[0].item.fileSlug).toBe('c');
		expect(plan.unchanged).toEqual([]);
	});

	it('skips a case that uses an unsupported seeding mode', () => {
		const plan = planPush([item('c', { seedThread: { threadId: 't' } })], {}, {});
		expect(plan.skipped).toHaveLength(1);
		expect(plan.skipped[0].fileSlug).toBe('c');
		expect(plan.skipped[0].reason).toMatch(/seedThread/);
		expect(plan.toCreate).toEqual([]);
	});

	it('treats a scenario-only difference as unchanged so re-runs converge', () => {
		const plan = planPush(
			[
				item('c', {
					executionScenarios: [
						{ name: 'a', description: 'd', dataSetup: 's', successCriteria: 'ok' },
					],
				}),
			],
			{
				'c.json': body({
					executionScenarios: [
						{ name: 'b', description: 'd2', dataSetup: 's2', successCriteria: 'ok2' },
					],
				}),
			},
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('ignores tags and datasets differences (the suite export does not round-trip them)', () => {
		const plan = planPush(
			[item('c', { tags: ['build', 'ai'], datasets: ['full'] })],
			// export comes back with empty tags and null datasets — must not count as a change
			{ 'c.json': body({ tags: [], datasets: null }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('ignores messageBudget on a single-turn case (export omits it there)', () => {
		const plan = planPush(
			[
				item('c', {
					conversation: [{ role: 'user', text: 'build a thing' }],
					messageBudget: 4,
				}),
			],
			{ 'c.json': body({ conversation: [{ role: 'user', text: 'build a thing' }] }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('still diffs messageBudget on a multi-turn case', () => {
		const multiTurn = [
			{ role: 'user', text: 'first' },
			{ role: 'assistant', text: 'q?' },
			{ role: 'user', text: 'second' },
		];
		const plan = planPush(
			[item('c', { conversation: multiTurn, messageBudget: 9 })],
			{ 'c.json': body({ conversation: multiTurn, messageBudget: 4 }) },
			{ c: 5 },
		);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.unchanged).toEqual([]);
	});

	it('folds legacy buildExpectations in the existing body before diffing', () => {
		// server still carries buildExpectations; disk uses outcomeExpectations — same content, no update
		const plan = planPush(
			[item('c', { outcomeExpectations: ['has a trigger'] })],
			{ 'c.json': body({ buildExpectations: ['has a trigger'] }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});
});

import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { comparableDiff, planPush, toUpdatePatch } from '../langtracer/push';
import type { LangTracerCreateCaseBody } from '../langtracer/to-exported';

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

/** The authored durable seed, in the shape both the disk case and the export carry. */
function inlineSeed(overrides: Record<string, unknown> = {}) {
	return {
		mode: 'inline' as const,
		messages: [
			{
				id: 'm1',
				type: 'llm',
				role: 'assistant' as const,
				createdAt: '2026-06-29T09:00:00.000Z',
				content: [{ type: 'text', text: 'built it' }],
			},
		],
		workflows: [{ id: 'wKk3RmT9xQ2bVn7L', name: 'Batch loop', nodes: [], connections: {} }],
		dataTables: [],
		...overrides,
	};
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

	it('skips a replay-seeded case — its trace expires, so it has no suite home', () => {
		const plan = planPush([item('c', { seed: { mode: 'replay', threadId: 't' } })], {}, {});
		expect(plan.skipped).toHaveLength(1);
		expect(plan.skipped[0].fileSlug).toBe('c');
		expect(plan.skipped[0].reason).toMatch(/replay seed/);
		expect(plan.toCreate).toEqual([]);
	});

	it('PUSHES an inline-seeded case — the durable kind is exactly what suites are for', () => {
		const plan = planPush([item('repair-it', { seed: inlineSeed() })], {}, {});
		expect(plan.skipped).toEqual([]);
		expect(plan.toCreate).toHaveLength(1);
	});

	// `seed` joined COMPARED_KEYS for these three: while it was excluded, every
	// seed-only edit was classified `unchanged` and silently never pushed.
	it('treats a seed-only addition to a hosted case as an update', () => {
		const plan = planPush([item('c', { seed: inlineSeed() })], { 'c.json': body() }, { c: 5 });
		expect(plan.toUpdate.map((u) => u.id)).toEqual([5]);
		expect(plan.unchanged).toEqual([]);
	});

	it('treats a seed EDIT on a hosted case as an update', () => {
		const plan = planPush(
			[item('c', { seed: inlineSeed({ dataTables: [{ name: 'Orders', columns: [] }] }) })],
			{ 'c.json': body({ seed: inlineSeed() }) },
			{ c: 5 },
		);
		expect(plan.toUpdate.map((u) => u.id)).toEqual([5]);
		expect(plan.unchanged).toEqual([]);
	});

	it('treats a seed REMOVAL as an update, so the patch can clear the stored one', () => {
		const plan = planPush([item('c')], { 'c.json': body({ seed: inlineSeed() }) }, { c: 5 });
		expect(plan.toUpdate.map((u) => u.id)).toEqual([5]);
		expect(plan.unchanged).toEqual([]);
	});

	// Shorthand is the shape case-shapes.md promotes, and expansion mints a fresh `id`
	// on every parse. Comparing ids would classify the case `toUpdate` on EVERY push
	// forever, leaving `--dry-run` permanently dirty. The identical-envelope test
	// can't catch it, because there both sides share one envelope.
	it('converges a shorthand-authored seed against its expanded stored export', () => {
		// Shorthand mints a fresh `id` per parse; its `createdAt` is deterministic, so
		// the two sides differ only in the id.
		const disk = inlineSeed({
			messages: [
				{
					id: 'freshly-minted-uuid',
					createdAt: '2020-01-01T00:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
		});
		const stored = inlineSeed({
			messages: [
				{
					id: 'stored-uuid',
					createdAt: '2020-01-01T00:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
		});

		const plan = planPush(
			[item('c', { seed: disk })],
			{ 'c.json': body({ seed: stored }) },
			{ c: 5 },
		);

		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('still detects a real seed edit under a differing id', () => {
		const disk = inlineSeed({
			messages: [
				{
					id: 'a',
					createdAt: '2026-06-29T09:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'DIFFERENT text' }],
				},
			],
		});
		const stored = inlineSeed({
			messages: [
				{
					id: 'b',
					createdAt: '2026-06-29T09:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
		});

		const plan = planPush(
			[item('c', { seed: disk })],
			{ 'c.json': body({ seed: stored }) },
			{ c: 5 },
		);

		expect(plan.toUpdate.map((u) => u.id)).toEqual([5]);
		expect(plan.unchanged).toEqual([]);
	});

	// cubic's P2: `createdAt` drives restore ordering, so an authored envelope's
	// timestamp edit changes what the agent sees and MUST reach the suite. Dropping
	// it from the comparison alongside `id` would have hidden that.
	it('detects an authored createdAt edit, which reorders the restored history', () => {
		const disk = inlineSeed({
			messages: [
				{
					id: 'same-id',
					createdAt: '2026-07-01T12:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
		});
		const stored = inlineSeed({
			messages: [
				{
					id: 'same-id',
					createdAt: '2026-06-29T09:00:00.000Z',
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'built it' }],
				},
			],
		});

		const plan = planPush(
			[item('c', { seed: disk })],
			{ 'c.json': body({ seed: stored }) },
			{ c: 5 },
		);

		expect(plan.toUpdate.map((u) => u.id)).toEqual([5]);
		expect(plan.unchanged).toEqual([]);
	});

	it('still reports an identically-seeded case as unchanged', () => {
		const plan = planPush(
			[item('c', { seed: inlineSeed() })],
			{ 'c.json': body({ seed: inlineSeed() }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('treats a scenario-only difference as an update (PATCH reconciles scenarios by name)', () => {
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
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.toUpdate[0].id).toBe(5);
		expect(plan.unchanged).toEqual([]);
	});

	it('treats removed scenarios as an update (disk case went process/outcome-only)', () => {
		const plan = planPush(
			[item('c')],
			{
				'c.json': body({
					executionScenarios: [{ name: 'a', dataSetup: 's', successCriteria: 'ok' }],
				}),
			},
			{ c: 5 },
		);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.unchanged).toEqual([]);
	});

	it('treats identical scenarios as unchanged so re-pushes converge', () => {
		const scenarios = [{ name: 'a', description: 'd', dataSetup: 's', successCriteria: 'ok' }];
		const plan = planPush(
			[item('c', { executionScenarios: scenarios })],
			{ 'c.json': body({ executionScenarios: scenarios }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('ignores tags differences (the suite export returns them empty)', () => {
		const plan = planPush(
			[item('c', { tags: ['build', 'ai'] })],
			{ 'c.json': body({ tags: [] }) },
			{ c: 5 },
		);
		expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
		expect(plan.toUpdate).toEqual([]);
	});

	it('treats a datasets difference as an update so tier edits re-sync', () => {
		const plan = planPush(
			[item('c', { datasets: ['mcp', 'pr', 'full'] })],
			// the stored case lost its tiers (exported as null) — the push must restore them
			{ 'c.json': body({ datasets: null }) },
			{ c: 5 },
		);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.toUpdate[0].id).toBe(5);
		expect(plan.unchanged).toEqual([]);
	});

	it('treats the default datasets as unchanged whether the export nulls or omits it', () => {
		const omitted = body();
		delete omitted.datasets;
		for (const exported of [body({ datasets: null }), omitted]) {
			const plan = planPush([item('c', { datasets: ['full'] })], { 'c.json': exported }, { c: 5 });
			expect(plan.unchanged.map((c) => c.fileSlug)).toEqual(['c']);
			expect(plan.toUpdate).toEqual([]);
		}
	});

	it('ignores datasets ordering', () => {
		const plan = planPush(
			[item('c', { datasets: ['pr', 'full', 'mcp'] })],
			{ 'c.json': body({ datasets: ['mcp', 'pr', 'full'] }) },
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

describe('toUpdatePatch', () => {
	function createBody(overrides: Partial<LangTracerCreateCaseBody> = {}): LangTracerCreateCaseBody {
		return {
			name: 'c',
			setKind: 'regression',
			synthetic: true,
			suiteId: 7,
			evalComplexity: 'simple',
			evalTags: ['build'],
			...overrides,
		};
	}

	it('drops the create-only fields', () => {
		const patch = toUpdatePatch(createBody());
		expect(patch).not.toHaveProperty('suiteId');
		expect(patch).not.toHaveProperty('synthetic');
		expect(patch.name).toBe('c');
	});

	it('sends an explicit empty scenarios list when the case has none, so a PATCH deletes stale rows', () => {
		// A case converted to process/outcome-only has no scenarios key; a partial
		// PATCH without it would leave the server's old scenario rows in place and
		// every later push would re-detect the same drift.
		const patch = toUpdatePatch(createBody());
		expect(patch.scenarios).toEqual([]);
	});

	it('keeps the mapped scenarios when the case has them', () => {
		const scenarios = [{ name: 'a', successCriteria: 'ok' }];
		const patch = toUpdatePatch(createBody({ scenarios }));
		expect(patch.scenarios).toEqual(scenarios);
	});

	it('sends an explicit null seed when the case has none, so a PATCH clears a stored one', () => {
		// lang-tracer treats an omitted `seed` as a no-op, so dropping the seed from a
		// disk case could never un-seed the hosted case without this.
		const patch = toUpdatePatch(createBody());
		expect(patch.seed).toBeNull();
	});

	it('keeps the seed when the case still has one', () => {
		const seed = inlineSeed();
		const patch = toUpdatePatch(createBody({ seed }));
		expect(patch.seed).toEqual(seed);
	});
});

// The post-write check the push runs after every create/update. A lang-tracer
// deployment predating a field's support ignores the key and still answers 200
// (`seed` needs #113, `attach` needs #119), so only re-reading the export can tell
// you the suite holds what you authored.
describe('comparableDiff (post-write verification)', () => {
	it('reports nothing when the server stored everything', () => {
		expect(
			comparableDiff(body({ seed: inlineSeed() }), item('c', { seed: inlineSeed() }).testCase),
		).toEqual([]);
	});

	it('names `seed` when a pre-#113 server dropped it', () => {
		const written = item('c', { seed: inlineSeed() }).testCase;
		expect(comparableDiff(body(), written)).toEqual(['seed']);
	});

	it('names `conversation` when a pre-#119 server dropped `attach`', () => {
		const handoff = [{ role: 'user', text: '', attach: { workflow: 'wKk3RmT9xQ2bVn7L' } }];
		const written = item('c', { conversation: handoff, seed: inlineSeed() }).testCase;
		// What such a server gives back: the turn, minus the attachment.
		const stored = body({ conversation: [{ role: 'user', text: '' }], seed: inlineSeed() });

		expect(comparableDiff(stored, written)).toEqual(['conversation']);
	});

	it('names every dropped field, not just the first', () => {
		const handoff = [{ role: 'user', text: '', attach: { workflow: 'wKk3RmT9xQ2bVn7L' } }];
		const written = item('c', { conversation: handoff, seed: inlineSeed() }).testCase;
		const stored = body({ conversation: [{ role: 'user', text: '' }] });

		expect(comparableDiff(stored, written).sort()).toEqual(['conversation', 'seed']);
	});

	it('treats a case missing from the export as everything dropped', () => {
		const written = item('c', { seed: inlineSeed() }).testCase;
		expect(comparableDiff(undefined, written)).toContain('seed');
	});
});

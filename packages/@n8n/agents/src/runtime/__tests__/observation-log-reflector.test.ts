import { InMemoryMemory } from '../memory-store';
import {
	buildObservationLogReflectorPrompt,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS,
} from '../observation-log-defaults';
import {
	parseObservationLogReflectionJson,
	renderObservationLogForReflection,
	runObservationLogReflector,
} from '../observation-log-reflector';

describe('observation-log reflector defaults', () => {
	it('keeps default policy and threshold configuration in the SDK', () => {
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS).toBe(24_000);
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT).toContain('Return JSON with two arrays');
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT).toContain('🔴 Critical');
	});

	it('builds the default reflector prompt from active log and token budget', () => {
		const prompt = buildObservationLogReflectorPrompt({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			now: new Date('2026-05-12T15:00:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog:
				'* [obs-1] 🔴 2026-05-12T14:30:00.000Z User chose observation-log memory.',
			tokenCount: 42,
			tokenBudget: 24_000,
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).toContain('Scope: thread:thread-1');
		expect(prompt).toContain('Active observation log tokens: 42');
		expect(prompt).toContain('Token budget: 24000');
		expect(prompt).toContain('[obs-1] 🔴');
	});
});

describe('parseObservationLogReflectionJson', () => {
	it('parses reflector JSON with marker symbols into storage markers', () => {
		const reflection = parseObservationLogReflectionJson(
			[
				'```json',
				'{',
				'  "drop": ["obs-1"],',
				'  "merge": [',
				'    { "supersedes": ["obs-2", "obs-3"], "marker": "🟡", "text": "Merged plan detail" }',
				'  ]',
				'}',
				'```',
			].join('\n'),
		);

		expect(reflection).toEqual({
			drop: ['obs-1'],
			merge: [
				{
					supersedes: ['obs-2', 'obs-3'],
					marker: 'important',
					text: 'Merged plan detail',
				},
			],
		});
	});
});

describe('renderObservationLogForReflection', () => {
	it('renders active observations with IDs for reflector input', () => {
		const rendered = renderObservationLogForReflection([
			{
				id: 'parent',
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'critical',
				text: 'User chose the observation-log model.',
				parentId: null,
				tokenCount: 10,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:30:00.000Z'),
			},
			{
				id: 'child',
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'completion',
				text: 'Plan 7 finished.',
				parentId: 'parent',
				tokenCount: 4,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:31:00.000Z'),
			},
		]);

		expect(rendered).toContain('* [parent] 🔴 2026-05-12T14:30:00.000Z User chose');
		expect(rendered).toContain('  * [child] ✅ 2026-05-12T14:31:00.000Z Plan 7');
	});

	it('renders active orphan children as top-level observations', () => {
		const rendered = renderObservationLogForReflection([
			{
				id: 'orphan',
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'important',
				text: 'Orphaned active observation remains relevant.',
				parentId: 'missing-parent',
				tokenCount: 4,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:32:00.000Z'),
			},
		]);

		expect(rendered).toContain('* [orphan] 🟡 2026-05-12T14:32:00.000Z Orphaned active');
	});
});

describe('runObservationLogReflector', () => {
	it('waits until the active observation log exceeds the reflector threshold', async () => {
		const store = new InMemoryMemory();
		await store.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'info',
				text: 'Small detail',
				tokenCount: 2,
			},
		]);
		const reflect = jest.fn().mockResolvedValue('{"drop":[],"merge":[]}');

		const result = await runObservationLogReflector({
			memory: store,
			scopeKind: 'thread',
			scopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			reflect,
		});

		expect(result).toEqual({ status: 'skipped', reason: 'below-threshold', tokenCount: 2 });
		expect(reflect).not.toHaveBeenCalled();
	});

	it('applies reflector drop and merge instructions transactionally', async () => {
		const store = new InMemoryMemory();
		const [stale, oldA, oldB] = await store.appendObservationLogEntries([
			{
				scopeKind: 'resource',
				scopeId: 'user-1',
				marker: 'info',
				text: 'Tiny aside',
				tokenCount: 9,
			},
			{
				scopeKind: 'resource',
				scopeId: 'user-1',
				marker: 'important',
				text: 'Old plan A',
				tokenCount: 9,
			},
			{
				scopeKind: 'resource',
				scopeId: 'user-1',
				marker: 'important',
				text: 'Old plan B',
				tokenCount: 9,
			},
		]);

		const result = await runObservationLogReflector({
			memory: store,
			scopeKind: 'resource',
			scopeId: 'user-1',
			reflectorThresholdTokens: 10,
			now: new Date('2026-05-12T15:00:00.000Z'),
			reflect: async (input) => {
				expect(input.renderedObservationLog).toContain(`[${stale.id}] 🟢`);
				return await Promise.resolve(
					JSON.stringify({
						drop: [stale.id],
						merge: [
							{
								supersedes: [oldA.id, oldB.id],
								marker: '🟡',
								text: 'User compared old plan A and old plan B.',
							},
						],
					}),
				);
			},
		});

		expect(result).toMatchObject({
			status: 'ran',
			tokenCount: 27,
			reflection: {
				drop: [stale.id],
				merge: [
					expect.objectContaining({
						supersedes: [oldA.id, oldB.id],
						marker: 'important',
						text: 'User compared old plan A and old plan B.',
						createdAt: new Date('2026-05-12T15:00:00.000Z'),
					}),
				],
			},
			overBudgetAfterReflection: false,
		});
		await expect(
			store.getObservationLog({ scopeKind: 'resource', scopeId: 'user-1', status: 'dropped' }),
		).resolves.toMatchObject([{ id: stale.id, status: 'dropped' }]);
		await expect(
			store.getObservationLog({ scopeKind: 'resource', scopeId: 'user-1', status: 'superseded' }),
		).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: oldA.id, status: 'superseded' }),
				expect.objectContaining({ id: oldB.id, status: 'superseded' }),
			]),
		);
	});

	it('warns but still applies reflection output that remains over budget', async () => {
		const store = new InMemoryMemory();
		const [critical, stale] = await store.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'critical',
				text: 'Large critical fact',
				tokenCount: 20,
			},
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'info',
				text: 'Small aside',
				tokenCount: 20,
			},
		]);
		const warnings: string[] = [];

		const result = await runObservationLogReflector({
			memory: store,
			scopeKind: 'thread',
			scopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			reflect: async () => await Promise.resolve(JSON.stringify({ drop: [stale.id], merge: [] })),
			onWarning: (warning) => warnings.push(warning.message),
		});

		expect(result).toMatchObject({
			status: 'ran',
			remainingTokenCount: 20,
			overBudgetAfterReflection: true,
		});
		expect(warnings).toEqual(['Observation log remains over reflector budget after reflection']);
		await expect(
			store.getActiveObservationLog({ scopeKind: 'thread', scopeId: 'thread-1' }),
		).resolves.toMatchObject([{ id: critical.id }]);
	});
});

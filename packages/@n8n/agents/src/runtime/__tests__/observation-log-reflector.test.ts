import type { ObservationLogEntry } from '../../types/sdk/observation-log';
import { InMemoryMemory } from '../memory-store';
import {
	buildObservationLogReflectorPrompt,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS,
} from '../observation-log-defaults';
import {
	normalizeObservationLogReflection,
	parseObservationLogReflectionJson,
	renderObservationLogForReflection,
	runObservationLogReflector,
} from '../observation-log-reflector';

function observation(overrides: Partial<ObservationLogEntry> = {}): ObservationLogEntry {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		scopeKind: overrides.scopeKind ?? 'thread',
		scopeId: overrides.scopeId ?? 'thread-1',
		marker: overrides.marker ?? 'important',
		text: overrides.text ?? 'Observation',
		parentId: overrides.parentId ?? null,
		tokenCount: overrides.tokenCount ?? 1,
		status: overrides.status ?? 'active',
		supersededBy: overrides.supersededBy ?? null,
		createdAt: overrides.createdAt ?? new Date('2026-05-12T14:30:00.000Z'),
	};
}

describe('observation-log reflector defaults', () => {
	it('keeps default policy and threshold configuration in the SDK', () => {
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS).toBe(4_000);
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT).toContain('Return JSON with two arrays');
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_PROMPT).toContain(
			'CRITICAL. Facts, decisions, identities, commitments',
		);
	});

	it('builds the default reflector prompt from active log and token budget', () => {
		const prompt = buildObservationLogReflectorPrompt({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			now: new Date('2026-05-12T15:00:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog:
				'* [obs-1] CRITICAL 2026-05-12T14:30:00.000Z User chose observation-log memory.',
			tokenCount: 42,
			tokenBudget: 8_000,
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).toContain('Scope: thread:thread-1');
		expect(prompt).toContain('Active observation log tokens: 42');
		expect(prompt).toContain('Token budget: 8000');
		expect(prompt).toContain('[obs-1] CRITICAL');
	});
});

describe('parseObservationLogReflectionJson', () => {
	it('parses reflector JSON with marker labels into storage markers', () => {
		const reflection = parseObservationLogReflectionJson(
			[
				'```json',
				'{',
				'  "drop": ["obs-1"],',
				'  "merge": [',
				'    { "supersedes": ["obs-2", "obs-3"], "marker": "IMPORTANT", "text": "Merged plan detail" }',
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

		expect(rendered).toContain('* [parent] CRITICAL 2026-05-12T14:30:00.000Z User chose');
		expect(rendered).toContain('  * [child] COMPLETION 2026-05-12T14:31:00.000Z Plan 7');
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

		expect(rendered).toContain('* [orphan] IMPORTANT 2026-05-12T14:32:00.000Z Orphaned active');
	});
});

describe('normalizeObservationLogReflection', () => {
	it('ignores child-only removal while the parent remains active', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });

		expect(
			normalizeObservationLogReflection([parent, child], {
				drop: [child.id],
				merge: [
					{
						supersedes: [child.id],
						marker: 'important',
						text: 'Child-only replacement',
					},
				],
			}),
		).toEqual({ drop: [], merge: [] });
	});

	it('expands parent drops to active descendants and lets merge win conflicting drops', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });
		const merged = observation({ id: 'merged' });

		expect(
			normalizeObservationLogReflection([parent, child, merged], {
				drop: [parent.id, merged.id],
				merge: [
					{
						supersedes: [merged.id],
						marker: 'important',
						text: 'Merged replacement',
					},
				],
			}),
		).toEqual({
			drop: [parent.id, child.id],
			merge: [
				{
					supersedes: [merged.id],
					marker: 'important',
					text: 'Merged replacement',
				},
			],
		});
	});

	it('expands parent merges to active descendants and clears inactive replacement parents', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });

		expect(
			normalizeObservationLogReflection([parent, child], {
				drop: [],
				merge: [
					{
						supersedes: [parent.id],
						marker: 'important',
						text: 'Merged parent and child',
						parentId: parent.id,
					},
				],
			}),
		).toEqual({
			drop: [],
			merge: [
				{
					supersedes: [parent.id, child.id],
					marker: 'important',
					text: 'Merged parent and child',
					parentId: null,
				},
			],
		});
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
				expect(input.renderedObservationLog).toContain(`[${stale.id}] INFO`);
				return await Promise.resolve(
					JSON.stringify({
						drop: [stale.id],
						merge: [
							{
								supersedes: [oldA.id, oldB.id],
								marker: 'IMPORTANT',
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

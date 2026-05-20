import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeEvalArtifacts, buildAggregateScorecard, buildMarkdownReport } from '../artifacts';
import { InspectableInMemoryMemory } from '../inspectable-memory';
import { aggregateScorecard } from '../scoring';
import type { EpisodicEvalScenarioResult } from '../types';

describe('episodic memory eval artifacts', () => {
	it('emits scorecard artifacts from in-memory episodic entries', async () => {
		const memory = new InspectableInMemoryMemory();
		const scope = { namespace: 'agent-1', resourceId: 'resource-1' };
		await memory.episodic.saveEntryWithSources(
			{
				...scope,
				content: 'North Pier uses `North Pier Vendor Queue - Trial`.',
				embeddingModel: 'test',
				embedding: [1, 0],
			},
			[
				{
					observationId: 'obs-1',
					threadId: 'thread-1',
					evidenceText: 'The tracker is North Pier Vendor Queue - Trial.',
				},
			],
		);
		const entries = memory.getEvalEntries(scope);
		const scorecard = aggregateScorecard({
			deterministic: {
				entryCoverage: 1,
				sourceBackedPrecision: 1,
				exactIdentifierRecall: 1,
				dedupeAccuracy: 1,
				lifecycleAccuracy: 1,
				scopeContaminationRate: 0,
				recallTopKHitRate: 1,
				mrr: 1,
				ndcg: 1,
				abstentionPrecision: 1,
				toolCallAccuracy: 1,
			},
		});
		const result = {
			scenarioId: 'smoke',
			scenarioName: 'Smoke',
			entries,
			recalls: [],
			finalAnswers: [],
			scorecard,
			failures: [],
		} satisfies EpisodicEvalScenarioResult;
		const outputDir = await mkdtemp(join(tmpdir(), 'em-eval-'));

		await writeEvalArtifacts(outputDir, {
			results: [result],
			entries,
			sources: entries.flatMap((item) => item.sources),
			recalls: [],
			answers: [],
			scorecard: buildAggregateScorecard([result]),
			report: buildMarkdownReport([result]),
			log: [],
		});

		await expect(readFile(join(outputDir, 'scorecard.json'), 'utf8')).resolves.toContain(
			'"overall": 1',
		);
		await expect(readFile(join(outputDir, 'entries.json'), 'utf8')).resolves.toContain(
			'North Pier Vendor Queue - Trial',
		);
		await expect(readFile(join(outputDir, 'report.md'), 'utf8')).resolves.toContain(
			'| Smoke | 1.000 | 1.000 | n/a | 0 |',
		);
		await expect(readFile(join(outputDir, 'log.json'), 'utf8')).resolves.toContain('[]');
	});
});

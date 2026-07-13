import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import type { EvaluationCollectionDetail } from '../evalCollections.types';
import { useCompareData } from './useCompareData';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const detail = (runs: EvaluationCollectionDetail['runs']): EvaluationCollectionDetail => ({
	id: 'col-1',
	name: 'Tone tuning',
	description: null,
	workflowId: 'wf-1',
	evaluationConfigId: 'cfg-1',
	createdById: 'u1',
	createdAt: '',
	updatedAt: '',
	runCount: runs.length,
	runs,
});

describe('useCompareData', () => {
	it('returns null until detail resolves', () => {
		const { compareData } = useCompareData(ref(null));
		expect(compareData.value).toBeNull();
	});

	it('maps runs to versions with letters and labels', () => {
		const source = ref(
			detail([
				{
					testRunId: 'run-a',
					workflowVersionId: null,
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.8,
					metrics: { helpfulness: 0.8 },
				},
				{
					testRunId: 'run-b',
					workflowVersionId: 'abcdef1234567890',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.9,
					metrics: { helpfulness: 0.9 },
				},
			]),
		);
		const { compareData } = useCompareData(source);
		const versions = compareData.value!.versions;

		expect(versions).toHaveLength(2);
		expect(versions[0].letter).toBe('A');
		expect(versions[1].letter).toBe('B');
		// null workflowVersionId → "current draft" label key
		expect(versions[0].label).toBe('evaluation.collections.card.currentDraft');
		// otherwise a 7-char short hash
		expect(versions[1].label).toBe('abcdef1');
	});

	it('charts only score-shaped metrics and picks the best version per metric', () => {
		const source = ref(
			detail([
				{
					testRunId: 'run-a',
					workflowVersionId: 'v1',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.7,
					metrics: { helpfulness: 0.7, totalTokens: 1200 },
				},
				{
					testRunId: 'run-b',
					workflowVersionId: 'v2',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.9,
					metrics: { helpfulness: 0.9, totalTokens: 1500 },
				},
			]),
		);
		const { compareData } = useCompareData(source);
		const groups = compareData.value!.metricGroups;

		// totalTokens (out of [0,1]) is excluded — only helpfulness is charted.
		expect(groups).toHaveLength(1);
		expect(groups[0].key).toBe('helpfulness');
		expect(groups[0].values).toEqual([0.7, 0.9]);
		expect(groups[0].bestIndex).toBe(1);
		expect(compareData.value!.bestVersionIndex).toBe(1);
	});

	it('excludes predefined operational metrics even when they land in [0, 1]', () => {
		const source = ref(
			detail([
				{
					testRunId: 'run-a',
					workflowVersionId: 'v1',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.7,
					// executionTime happens to be in [0, 1] here, but it's an absolute
					// operational metric — it must not be charted as a score.
					metrics: { helpfulness: 0.7, executionTime: 0.4, totalTokens: 1 },
				},
			]),
		);
		const { compareData } = useCompareData(source);
		const keys = compareData.value!.metricGroups.map((g) => g.key);

		expect(keys).toEqual(['helpfulness']);
	});

	it('aligns a metric missing on one run to null without shifting later versions', () => {
		const source = ref(
			detail([
				{
					testRunId: 'run-a',
					workflowVersionId: 'v1',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.6,
					metrics: { correctness: 0.6 },
				},
				{
					testRunId: 'run-b',
					workflowVersionId: 'v2',
					status: 'completed',
					runAt: null,
					completedAt: null,
					avgScore: 0.8,
					metrics: { correctness: 0.8, helpfulness: 0.5 },
				},
			]),
		);
		const { compareData } = useCompareData(source);
		const groups = compareData.value!.metricGroups;
		const helpfulness = groups.find((g) => g.key === 'helpfulness')!;

		// run-a lacks helpfulness → its slot is null, run-b keeps index 1
		expect(helpfulness.values).toEqual([null, 0.5]);
		expect(helpfulness.bestIndex).toBe(1);
	});
});

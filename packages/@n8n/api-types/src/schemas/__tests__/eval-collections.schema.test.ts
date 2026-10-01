import type { EvaluationMetric } from '../../dto/evaluations/evaluation-config.dto';
import {
	averageNormalizedScore,
	metricScaleFromConfig,
	metricScalesFromConfig,
	metricScalesFromSnapshot,
	normalizedScores,
	normalizeMetricScore,
	RESERVED_METRIC_KEYS,
} from '../eval-collections.schema';

describe('normalizeMetricScore', () => {
	it('excludes reserved operational metrics', () => {
		for (const key of RESERVED_METRIC_KEYS) {
			// Even a value that happens to land in [0, 1] is not a score.
			expect(normalizeMetricScore(key, 0.5)).toBeNull();
			expect(normalizeMetricScore(key, 1719)).toBeNull();
		}
	});

	it('returns null for NaN', () => {
		expect(normalizeMetricScore('accuracy', Number.NaN)).toBeNull();
		expect(normalizeMetricScore('correctness', Number.NaN)).toBeNull();
		expect(normalizeMetricScore('anything', Number.NaN, 'oneToFive')).toBeNull();
	});

	describe('with an explicit scale (resolved from the eval config)', () => {
		it('normalizes any 1–5 metric onto [0, 1] regardless of its name', () => {
			// The bug: a 1–5 judge metric named anything other than
			// correctness/helpfulness used to fall to the unit branch → dropped.
			expect(normalizeMetricScore('Markdown Formatting', 5, 'oneToFive')).toBe(1);
			expect(normalizeMetricScore('Markdown Formatting', 4, 'oneToFive')).toBe(0.8);
			expect(normalizeMetricScore('Tone Match', 2.5, 'oneToFive')).toBe(0.5);
			// Out of the 1–5 range once scaled → excluded.
			expect(normalizeMetricScore('Markdown Formatting', 6, 'oneToFive')).toBeNull();
		});

		it('clamps boolean-scale metrics to [0, 1]', () => {
			expect(normalizeMetricScore('Passes Schema', 1, 'boolean')).toBe(1);
			expect(normalizeMetricScore('Passes Schema', 0, 'boolean')).toBe(0);
			// An averaged pass rate passes through unchanged.
			expect(normalizeMetricScore('Passes Schema', 0.75, 'boolean')).toBe(0.75);
			// Out-of-range values clamp rather than drop.
			expect(normalizeMetricScore('Passes Schema', 1.4, 'boolean')).toBe(1);
			expect(normalizeMetricScore('Passes Schema', -0.2, 'boolean')).toBe(0);
		});

		it('passes unit-scale metrics through only when already in [0, 1]', () => {
			expect(normalizeMetricScore('accuracy', 0.9, 'unit')).toBe(0.9);
			expect(normalizeMetricScore('accuracy', 1.5, 'unit')).toBeNull();
			// A 1–5 value forced onto the unit scale is (correctly) dropped.
			expect(normalizeMetricScore('correctness', 5, 'unit')).toBeNull();
		});
	});

	describe('name-based fallback (no scale passed)', () => {
		it('normalizes the preset 1–5 judge metrics onto [0, 1]', () => {
			expect(normalizeMetricScore('correctness', 5)).toBe(1);
			expect(normalizeMetricScore('correctness', 4)).toBe(0.8);
			expect(normalizeMetricScore('correctness', 1)).toBe(0.2);
			expect(normalizeMetricScore('helpfulness', 2.5)).toBe(0.5);
		});

		it('drops preset judge values that fall outside the 1–5 range once scaled', () => {
			// 6 / 5 = 1.2 → out of [0, 1]
			expect(normalizeMetricScore('correctness', 6)).toBeNull();
			expect(normalizeMetricScore('helpfulness', -1)).toBeNull();
		});

		it('passes through other metrics only when already in [0, 1]', () => {
			expect(normalizeMetricScore('accuracy', 0.9)).toBe(0.9);
			expect(normalizeMetricScore('accuracy', 0)).toBe(0);
			expect(normalizeMetricScore('accuracy', 1)).toBe(1);
			// Unknown-scale values outside [0, 1] can't be scaled → excluded.
			expect(normalizeMetricScore('accuracy', 1.5)).toBeNull();
			expect(normalizeMetricScore('accuracy', -0.2)).toBeNull();
		});
	});
});

describe('metricScaleFromConfig', () => {
	const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';

	it('maps a numeric LLM judge to oneToFive whatever it is named', () => {
		const metric: EvaluationMetric = {
			id: 'm1',
			name: 'Markdown Formatting',
			type: 'llm_judge',
			config: {
				preset: 'correctness',
				provider: OPENAI,
				credentialId: 'cred-1',
				model: 'gpt-4o',
				outputType: 'numeric',
				inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
			},
		};
		expect(metricScaleFromConfig(metric)).toBe('oneToFive');
	});

	it('maps a boolean-outputType LLM judge to oneToFive (the compiler ignores a judge outputType)', () => {
		const metric: EvaluationMetric = {
			id: 'm2',
			name: 'Is Correct',
			type: 'llm_judge',
			config: {
				preset: 'correctness',
				provider: OPENAI,
				credentialId: 'cred-1',
				model: 'gpt-4o',
				outputType: 'boolean',
				inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
			},
		};
		expect(metricScaleFromConfig(metric)).toBe('oneToFive');
	});

	it('maps a numeric expression metric to unit and a boolean one to boolean', () => {
		const numericMetric: EvaluationMetric = {
			id: 'm3',
			name: 'Ratio',
			type: 'expression',
			config: { expression: '={{ 0.5 }}', outputType: 'numeric' },
		};
		const booleanMetric: EvaluationMetric = {
			id: 'm4',
			name: 'Non-empty',
			type: 'expression',
			config: { expression: '={{ true }}', outputType: 'boolean' },
		};
		expect(metricScaleFromConfig(numericMetric)).toBe('unit');
		expect(metricScaleFromConfig(booleanMetric)).toBe('boolean');
	});

	it('maps deterministic scorers to unit', () => {
		const stringSimilarity: EvaluationMetric = {
			id: 'm5',
			name: 'String Similarity',
			type: 'string_similarity',
			config: { inputs: { actualAnswer: 'a', expectedAnswer: 'b' } },
		};
		const categorization: EvaluationMetric = {
			id: 'm6',
			name: 'Category Match',
			type: 'categorization',
			config: { inputs: { actualAnswer: 'a', expectedAnswer: 'b' } },
		};
		const toolsUsed: EvaluationMetric = {
			id: 'm7',
			name: 'Tools Used',
			type: 'tools_used',
			config: { inputs: { expectedTools: 'x', intermediateSteps: '={{ [] }}' } },
		};
		expect(metricScaleFromConfig(stringSimilarity)).toBe('unit');
		expect(metricScaleFromConfig(categorization)).toBe('unit');
		expect(metricScaleFromConfig(toolsUsed)).toBe('unit');
	});
});

describe('metricScalesFromConfig', () => {
	const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';

	it('maps each metric name to its scale', () => {
		const metrics: EvaluationMetric[] = [
			{
				id: 'm1',
				name: 'Markdown Formatting',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: OPENAI,
					credentialId: 'cred-1',
					model: 'gpt-4o',
					outputType: 'numeric',
					inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
				},
			},
			{
				id: 'm2',
				name: 'Passes Schema',
				type: 'expression',
				config: { expression: '={{ true }}', outputType: 'boolean' },
			},
			{
				id: 'm3',
				name: 'Similarity',
				type: 'string_similarity',
				config: { inputs: { actualAnswer: 'a', expectedAnswer: 'b' } },
			},
		];

		const scales = metricScalesFromConfig(metrics);
		expect(scales['Markdown Formatting']).toBe('oneToFive');
		expect(scales['Passes Schema']).toBe('boolean');
		expect(scales.Similarity).toBe('unit');
		expect(Object.keys(scales)).toHaveLength(3);
	});

	it('returns an empty map for no metrics', () => {
		expect(metricScalesFromConfig([])).toEqual({});
	});
});

describe('metricScalesFromSnapshot', () => {
	const OPENAI = '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	const snapshot = {
		id: 'cfg-1',
		metrics: [
			{
				id: 'm1',
				name: 'Markdown Formatting',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: OPENAI,
					credentialId: 'cred-1',
					model: 'gpt-4o',
					outputType: 'numeric',
					inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
				},
			},
		],
	};

	it("resolves scales from a frozen snapshot's metrics", () => {
		expect(metricScalesFromSnapshot(snapshot)).toEqual({ 'Markdown Formatting': 'oneToFive' });
	});

	it('returns null when the snapshot lacks a valid metrics array (→ caller falls back)', () => {
		expect(metricScalesFromSnapshot(null)).toBeNull();
		expect(metricScalesFromSnapshot({})).toBeNull();
		expect(metricScalesFromSnapshot({ metrics: 'nope' })).toBeNull();
		expect(metricScalesFromSnapshot({ metrics: [{ name: 'x' }] })).toBeNull();
	});
});

describe('normalizedScores', () => {
	it('drops operational/unknown-scale metrics and keeps scored ones', () => {
		const scores = normalizedScores({ correctness: 5, totalTokens: 1234, helpfulness: 4 });
		// correctness/helpfulness are 1–5 by name → /5; totalTokens is reserved → dropped.
		expect(scores).toEqual({ correctness: 1, helpfulness: 0.8 });
	});

	it('coerces booleans to 0/1 before scaling', () => {
		expect(normalizedScores({ Passed: true }, { Passed: 'boolean' })).toEqual({ Passed: 1 });
		expect(normalizedScores({ Passed: false }, { Passed: 'boolean' })).toEqual({ Passed: 0 });
	});

	it('honours an explicit scale over the name heuristic', () => {
		expect(normalizedScores({ accuracy: 0.9 }, { accuracy: 'unit' })).toEqual({ accuracy: 0.9 });
	});

	it('returns an empty map for nullish metrics', () => {
		expect(normalizedScores(null)).toEqual({});
		expect(normalizedScores(undefined)).toEqual({});
	});
});

describe('averageNormalizedScore', () => {
	it('means the qualifying scores', () => {
		// correctness 4 → 0.8, helpfulness 2.5 → 0.5; mean 0.65.
		expect(averageNormalizedScore({ correctness: 4, helpfulness: 2.5 })).toBeCloseTo(0.65);
	});

	it('ignores dropped metrics when averaging', () => {
		// totalTokens is reserved → excluded, so the mean is just correctness.
		expect(averageNormalizedScore({ correctness: 5, totalTokens: 999 })).toBe(1);
	});

	it('returns null when nothing qualifies', () => {
		expect(averageNormalizedScore({ totalTokens: 10 })).toBeNull();
		expect(averageNormalizedScore(null)).toBeNull();
	});
});

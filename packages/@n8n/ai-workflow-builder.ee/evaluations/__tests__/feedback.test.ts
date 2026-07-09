import { langsmithMetricKey, toLangsmithEvaluationResult } from '../harness/feedback';
import type { Feedback } from '../harness/harness-types';

describe('langsmithMetricKey()', () => {
	it('should keep llm-judge metrics unprefixed (root and sub-metrics)', () => {
		const root: Feedback = {
			evaluator: 'llm-judge',
			metric: 'overallScore',
			score: 1,
			kind: 'score',
		};
		const sub: Feedback = {
			evaluator: 'llm-judge',
			metric: 'maintainability.workflowOrganization',
			score: 1,
			kind: 'detail',
		};

		expect(langsmithMetricKey(root)).toBe('overallScore');
		expect(langsmithMetricKey(sub)).toBe('maintainability.workflowOrganization');
	});

	it('should prefix programmatic metrics with evaluator name', () => {
		const fb: Feedback = { evaluator: 'programmatic', metric: 'trigger', score: 1, kind: 'metric' };
		expect(langsmithMetricKey(fb)).toBe('programmatic.trigger');
	});

	it('should keep pairwise v1 metrics unprefixed and namespace non-v1 details', () => {
		const v1: Feedback = {
			evaluator: 'pairwise',
			metric: 'pairwise_primary',
			score: 0,
			kind: 'score',
		};
		const detail: Feedback = { evaluator: 'pairwise', metric: 'judge1', score: 0, kind: 'detail' };

		expect(langsmithMetricKey(v1)).toBe('pairwise_primary');
		expect(langsmithMetricKey(detail)).toBe('pairwise.judge1');
	});

	it('should prefix metrics evaluator with evaluator name', () => {
		const discoveryLatency: Feedback = {
			evaluator: 'metrics',
			metric: 'discovery_latency_s',
			score: 0.5,
			kind: 'metric',
		};
		const builderLatency: Feedback = {
			evaluator: 'metrics',
			metric: 'builder_latency_s',
			score: 1.5,
			kind: 'metric',
		};
		const responderLatency: Feedback = {
			evaluator: 'metrics',
			metric: 'responder_latency_s',
			score: 0.2,
			kind: 'metric',
		};
		const nodeCount: Feedback = {
			evaluator: 'metrics',
			metric: 'node_count',
			score: 5,
			kind: 'metric',
		};

		expect(langsmithMetricKey(discoveryLatency)).toBe('metrics.discovery_latency_s');
		expect(langsmithMetricKey(builderLatency)).toBe('metrics.builder_latency_s');
		expect(langsmithMetricKey(responderLatency)).toBe('metrics.responder_latency_s');
		expect(langsmithMetricKey(nodeCount)).toBe('metrics.node_count');
	});

	it('should not produce collisions for the known evaluator contract', () => {
		const feedback: Feedback[] = [
			{ evaluator: 'llm-judge', metric: 'connections', score: 1, kind: 'metric' },
			{ evaluator: 'llm-judge', metric: 'overallScore', score: 1, kind: 'score' },
			{ evaluator: 'programmatic', metric: 'connections', score: 1, kind: 'metric' },
			{ evaluator: 'programmatic', metric: 'overall', score: 1, kind: 'score' },
			{ evaluator: 'pairwise', metric: 'pairwise_primary', score: 1, kind: 'score' },
			{ evaluator: 'pairwise', metric: 'pairwise_total_violations', score: 1, kind: 'detail' },
			{ evaluator: 'pairwise', metric: 'judge1', score: 0, kind: 'detail' },
			{ evaluator: 'metrics', metric: 'discovery_latency_s', score: 0.5, kind: 'metric' },
			{ evaluator: 'metrics', metric: 'node_count', score: 5, kind: 'metric' },
		];

		const keys = feedback.map(langsmithMetricKey);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('toLangsmithEvaluationResult()', () => {
	it('should clamp scores exceeding LangSmith max limit (safety net)', () => {
		const fb: Feedback = {
			evaluator: 'metrics',
			metric: 'some_metric',
			score: 150000, // Exceeds 99999.9999
			kind: 'metric',
		};

		const result = toLangsmithEvaluationResult(fb);
		expect(result.score).toBe(99999.9999);
	});

	it('should clamp scores below LangSmith min limit (safety net)', () => {
		const fb: Feedback = {
			evaluator: 'metrics',
			metric: 'some_metric',
			score: -200000,
			kind: 'metric',
		};

		const result = toLangsmithEvaluationResult(fb);
		expect(result.score).toBe(-99999.9999);
	});

	it('should preserve scores within valid range', () => {
		const fb: Feedback = {
			evaluator: 'metrics',
			metric: 'discovery_latency_s',
			score: 161.288, // 161 seconds, well within limits
			kind: 'metric',
		};

		const result = toLangsmithEvaluationResult(fb);
		expect(result.score).toBe(161.288);
	});

	it('should include comment when present', () => {
		const fb: Feedback = {
			evaluator: 'llm-judge',
			metric: 'overallScore',
			score: 0.85,
			kind: 'score',
			comment: 'Good workflow',
		};

		const result = toLangsmithEvaluationResult(fb);
		expect(result.comment).toBe('Good workflow');
	});

	it('should not include comment when absent', () => {
		const fb: Feedback = {
			evaluator: 'llm-judge',
			metric: 'overallScore',
			score: 0.85,
			kind: 'score',
		};

		const result = toLangsmithEvaluationResult(fb);
		expect(result.comment).toBeUndefined();
	});
});

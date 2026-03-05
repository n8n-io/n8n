import type { EvaluationResult, CategoryScore } from './evaluation';
import {
	calculateWeightedScore,
	generateEvaluationSummary,
	identifyCriticalIssues,
	LLM_JUDGE_CATEGORY_WEIGHTS,
	TOTAL_WEIGHT_WITHOUT_STRUCTURAL,
	TOTAL_WEIGHT_WITH_STRUCTURAL,
} from './workflow-evaluator';

/**
 * Creates a minimal category score for testing.
 */
function createCategoryScore(
	score: number,
	violations: CategoryScore['violations'] = [],
): CategoryScore {
	return { score, violations };
}

/**
 * Creates a complete evaluation result with all scores set to the same value.
 */
function createUniformResult(score: number): EvaluationResult {
	return {
		overallScore: 0,
		functionality: createCategoryScore(score),
		connections: createCategoryScore(score),
		expressions: createCategoryScore(score),
		nodeConfiguration: createCategoryScore(score),
		efficiency: {
			...createCategoryScore(score),
			redundancyScore: score,
			pathOptimization: score,
			nodeCountEfficiency: score,
		},
		dataFlow: createCategoryScore(score),
		maintainability: {
			...createCategoryScore(score),
			nodeNamingQuality: score,
			workflowOrganization: score,
			modularity: score,
		},
		bestPractices: createCategoryScore(score),
		structuralSimilarity: {
			score: 0,
			violations: [],
			applicable: false,
		},
		summary: '',
	};
}

describe('workflow-evaluator', () => {
	describe('calculateWeightedScore', () => {
		it('should return 1.0 when all scores are perfect', () => {
			const result = createUniformResult(1.0);
			expect(calculateWeightedScore(result)).toBeCloseTo(1.0, 5);
		});

		it('should return 0 when all scores are zero', () => {
			const result = createUniformResult(0);
			expect(calculateWeightedScore(result)).toBe(0);
		});

		it('should return 0.5 when all scores are 0.5', () => {
			const result = createUniformResult(0.5);
			expect(calculateWeightedScore(result)).toBeCloseTo(0.5, 5);
		});

		it('should weight functionality at 25%', () => {
			const result = createUniformResult(0);
			result.functionality.score = 1.0;
			const expected = LLM_JUDGE_CATEGORY_WEIGHTS.functionality / TOTAL_WEIGHT_WITHOUT_STRUCTURAL;
			expect(calculateWeightedScore(result)).toBeCloseTo(expected, 5);
		});

		it('should weight connections at 15%', () => {
			const result = createUniformResult(0);
			result.connections.score = 1.0;
			const expected = LLM_JUDGE_CATEGORY_WEIGHTS.connections / TOTAL_WEIGHT_WITHOUT_STRUCTURAL;
			expect(calculateWeightedScore(result)).toBeCloseTo(expected, 5);
		});

		it('should include structural similarity when applicable', () => {
			const result = createUniformResult(1.0);
			result.structuralSimilarity = {
				score: 0,
				violations: [],
				applicable: true,
			};
			// With structural similarity at 0, weighted sum = TOTAL_WEIGHT_WITHOUT_STRUCTURAL
			const expected = TOTAL_WEIGHT_WITHOUT_STRUCTURAL / TOTAL_WEIGHT_WITH_STRUCTURAL;
			expect(calculateWeightedScore(result)).toBeCloseTo(expected, 5);
		});

		it('should not include structural similarity when not applicable', () => {
			const result = createUniformResult(1.0);
			result.structuralSimilarity = {
				score: 0.5,
				violations: [],
				applicable: false,
			};
			// Should still be 1.0 since structural similarity is not counted
			expect(calculateWeightedScore(result)).toBeCloseTo(1.0, 5);
		});

		it('should handle mixed scores correctly', () => {
			const result = createUniformResult(0);
			result.functionality.score = 1.0;
			result.connections.score = 0.8;
			result.expressions.score = 0.6;
			result.nodeConfiguration.score = 0.4;
			result.efficiency.score = 0.2;
			result.dataFlow.score = 0.0;
			result.maintainability.score = 1.0;
			result.bestPractices.score = 0.5;

			const w = LLM_JUDGE_CATEGORY_WEIGHTS;
			const weightedSum =
				1.0 * w.functionality +
				0.8 * w.connections +
				0.6 * w.expressions +
				0.4 * w.nodeConfiguration +
				0.2 * w.efficiency +
				0.0 * w.dataFlow +
				1.0 * w.maintainability +
				0.5 * w.bestPractices;
			const expected = weightedSum / TOTAL_WEIGHT_WITHOUT_STRUCTURAL;

			expect(calculateWeightedScore(result)).toBeCloseTo(expected, 5);
		});
	});

	describe('generateEvaluationSummary', () => {
		it('should list strengths for scores >= 0.8', () => {
			const result = createUniformResult(0.9);
			const summary = generateEvaluationSummary(result);

			expect(summary).toContain('strong functional implementation');
			expect(summary).toContain('well-connected nodes');
			expect(summary).toContain('correct expression syntax');
			expect(summary).toContain('well-configured nodes');
			expect(summary).toContain('proper data flow');
			expect(summary).toContain('efficient design');
			expect(summary).toContain('maintainable structure');
			expect(summary).toContain('follows best practices');
		});

		it('should list weaknesses for scores < 0.5', () => {
			const result = createUniformResult(0.3);
			const summary = generateEvaluationSummary(result);

			expect(summary).toContain('functional gaps');
			expect(summary).toContain('connection issues');
			expect(summary).toContain('expression errors');
			expect(summary).toContain('node configuration issues');
			expect(summary).toContain('data flow problems');
			expect(summary).toContain('inefficiencies');
			expect(summary).toContain('poor maintainability');
			expect(summary).toContain('deviates from best practices');
		});

		it('should not list scores between 0.5 and 0.8 as strengths or weaknesses', () => {
			const result = createUniformResult(0.65);
			const summary = generateEvaluationSummary(result);

			// Should return the default message since no strengths or weaknesses
			expect(summary).toBe(
				'The workflow shows adequate implementation across all evaluated metrics.',
			);
		});

		it('should handle mixed scores', () => {
			const result = createUniformResult(0.65);
			result.functionality.score = 0.9; // strength
			result.connections.score = 0.3; // weakness

			const summary = generateEvaluationSummary(result);

			expect(summary).toContain('strong functional implementation');
			expect(summary).toContain('connection issues');
			expect(summary).not.toContain('adequate implementation');
		});

		it('should format summary with proper grammar', () => {
			const result = createUniformResult(0.65);
			result.functionality.score = 0.9;
			result.connections.score = 0.9;

			const summary = generateEvaluationSummary(result);

			expect(summary).toMatch(/^The workflow demonstrates .+\.$/);
			expect(summary).toContain(', '); // Multiple strengths should be comma-separated
		});

		it('should include "Key areas for improvement" for weaknesses', () => {
			const result = createUniformResult(0.65);
			result.functionality.score = 0.3;

			const summary = generateEvaluationSummary(result);

			expect(summary).toContain('Key areas for improvement include');
		});
	});

	describe('identifyCriticalIssues', () => {
		it('should return undefined when no critical violations exist', () => {
			const result = createUniformResult(0.5);
			result.functionality.violations = [
				{ type: 'major', description: 'Some major issue', pointsDeducted: 20 },
				{ type: 'minor', description: 'Some minor issue', pointsDeducted: 5 },
			];

			expect(identifyCriticalIssues(result)).toBeUndefined();
		});

		it('should extract critical violations from all categories', () => {
			const result = createUniformResult(0.5);
			result.functionality.violations = [
				{ type: 'critical', description: 'Missing trigger', pointsDeducted: 50 },
			];
			result.connections.violations = [
				{ type: 'critical', description: 'Disconnected node', pointsDeducted: 40 },
			];

			const issues = identifyCriticalIssues(result);

			expect(issues).toHaveLength(2);
			expect(issues).toContain('[functionality] Missing trigger');
			expect(issues).toContain('[connections] Disconnected node');
		});

		it('should only include critical violations, not major or minor', () => {
			const result = createUniformResult(0.5);
			result.functionality.violations = [
				{ type: 'critical', description: 'Critical issue', pointsDeducted: 50 },
				{ type: 'major', description: 'Major issue', pointsDeducted: 20 },
				{ type: 'minor', description: 'Minor issue', pointsDeducted: 5 },
			];

			const issues = identifyCriticalIssues(result);

			expect(issues).toHaveLength(1);
			expect(issues).toContain('[functionality] Critical issue');
		});

		it('should handle multiple critical violations in same category', () => {
			const result = createUniformResult(0.5);
			result.functionality.violations = [
				{ type: 'critical', description: 'First critical', pointsDeducted: 50 },
				{ type: 'critical', description: 'Second critical', pointsDeducted: 40 },
			];

			const issues = identifyCriticalIssues(result);

			expect(issues).toHaveLength(2);
			expect(issues).toContain('[functionality] First critical');
			expect(issues).toContain('[functionality] Second critical');
		});

		it('should check all eight evaluation categories', () => {
			const result = createUniformResult(0.5);

			// Add a critical violation to each category
			result.functionality.violations = [
				{ type: 'critical', description: 'func issue', pointsDeducted: 50 },
			];
			result.connections.violations = [
				{ type: 'critical', description: 'conn issue', pointsDeducted: 50 },
			];
			result.expressions.violations = [
				{ type: 'critical', description: 'expr issue', pointsDeducted: 50 },
			];
			result.nodeConfiguration.violations = [
				{ type: 'critical', description: 'config issue', pointsDeducted: 50 },
			];
			result.efficiency.violations = [
				{ type: 'critical', description: 'eff issue', pointsDeducted: 50 },
			];
			result.dataFlow.violations = [
				{ type: 'critical', description: 'flow issue', pointsDeducted: 50 },
			];
			result.maintainability.violations = [
				{ type: 'critical', description: 'maint issue', pointsDeducted: 50 },
			];
			result.bestPractices.violations = [
				{ type: 'critical', description: 'bp issue', pointsDeducted: 50 },
			];

			const issues = identifyCriticalIssues(result);

			expect(issues).toHaveLength(8);
			expect(issues).toContain('[functionality] func issue');
			expect(issues).toContain('[connections] conn issue');
			expect(issues).toContain('[expressions] expr issue');
			expect(issues).toContain('[nodeConfiguration] config issue');
			expect(issues).toContain('[efficiency] eff issue');
			expect(issues).toContain('[dataFlow] flow issue');
			expect(issues).toContain('[maintainability] maint issue');
			expect(issues).toContain('[bestPractices] bp issue');
		});

		it('should return undefined for empty violations arrays', () => {
			const result = createUniformResult(1.0);
			expect(identifyCriticalIssues(result)).toBeUndefined();
		});
	});
});

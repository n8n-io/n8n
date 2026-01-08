/**
 * Tests for multi-generation utilities.
 *
 * These utilities support aggregating results across multiple workflow
 * generations in pairwise evaluation.
 */

import type { SimpleWorkflow } from '@/types/workflow';

import {
	getMajorityThreshold,
	aggregateGenerations,
	type GenerationDetail,
} from '../harness/multi-gen';

/** Helper to create a mock workflow */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create a generation detail */
function createGenerationDetail(overrides: Partial<GenerationDetail> = {}): GenerationDetail {
	return {
		workflow: createMockWorkflow(),
		majorityPass: true,
		diagnosticScore: 0.8,
		primaryPasses: 2,
		numJudges: 3,
		...overrides,
	};
}

describe('Multi-Generation Utilities', () => {
	describe('getMajorityThreshold()', () => {
		it('should throw for 0 judges', () => {
			expect(() => getMajorityThreshold(0)).toThrow('numJudges must be >= 1');
		});

		it('should return 1 for 1 judge', () => {
			expect(getMajorityThreshold(1)).toBe(1);
		});

		it('should return 2 for 3 judges', () => {
			expect(getMajorityThreshold(3)).toBe(2);
		});

		it('should return 3 for 5 judges', () => {
			expect(getMajorityThreshold(5)).toBe(3);
		});

		it('should return 1 for 2 judges (tie-goes-to-pass)', () => {
			expect(getMajorityThreshold(2)).toBe(1);
		});

		it('should return 2 for 4 judges (tie-goes-to-pass)', () => {
			expect(getMajorityThreshold(4)).toBe(2);
		});
	});

	describe('aggregateGenerations()', () => {
		it('should calculate generation correctness', () => {
			const details = [
				createGenerationDetail({ majorityPass: true }),
				createGenerationDetail({ majorityPass: true }),
				createGenerationDetail({ majorityPass: false }),
			];

			const result = aggregateGenerations(details);

			expect(result.generationCorrectness).toBeCloseTo(2 / 3);
			expect(result.passingGenerations).toBe(2);
			expect(result.totalGenerations).toBe(3);
		});

		it('should calculate aggregated diagnostic score', () => {
			const details = [
				createGenerationDetail({ diagnosticScore: 0.9 }),
				createGenerationDetail({ diagnosticScore: 0.8 }),
				createGenerationDetail({ diagnosticScore: 0.7 }),
			];

			const result = aggregateGenerations(details);

			expect(result.aggregatedDiagnosticScore).toBeCloseTo(0.8);
		});

		it('should count passing generations', () => {
			const details = [
				createGenerationDetail({ majorityPass: true }),
				createGenerationDetail({ majorityPass: false }),
				createGenerationDetail({ majorityPass: true }),
				createGenerationDetail({ majorityPass: true }),
				createGenerationDetail({ majorityPass: false }),
			];

			const result = aggregateGenerations(details);

			expect(result.passingGenerations).toBe(3);
			expect(result.totalGenerations).toBe(5);
		});

		it('should handle all passing', () => {
			const details = [
				createGenerationDetail({ majorityPass: true, diagnosticScore: 1.0 }),
				createGenerationDetail({ majorityPass: true, diagnosticScore: 1.0 }),
				createGenerationDetail({ majorityPass: true, diagnosticScore: 1.0 }),
			];

			const result = aggregateGenerations(details);

			expect(result.generationCorrectness).toBe(1);
			expect(result.aggregatedDiagnosticScore).toBe(1);
			expect(result.passingGenerations).toBe(3);
		});

		it('should handle all failing', () => {
			const details = [
				createGenerationDetail({ majorityPass: false, diagnosticScore: 0.3 }),
				createGenerationDetail({ majorityPass: false, diagnosticScore: 0.2 }),
				createGenerationDetail({ majorityPass: false, diagnosticScore: 0.1 }),
			];

			const result = aggregateGenerations(details);

			expect(result.generationCorrectness).toBe(0);
			expect(result.aggregatedDiagnosticScore).toBeCloseTo(0.2);
			expect(result.passingGenerations).toBe(0);
		});

		it('should handle single generation', () => {
			const details = [createGenerationDetail({ majorityPass: true, diagnosticScore: 0.95 })];

			const result = aggregateGenerations(details);

			expect(result.generationCorrectness).toBe(1);
			expect(result.aggregatedDiagnosticScore).toBe(0.95);
			expect(result.passingGenerations).toBe(1);
			expect(result.totalGenerations).toBe(1);
		});

		it('should preserve generation details', () => {
			const workflow1 = createMockWorkflow('Workflow 1');
			const workflow2 = createMockWorkflow('Workflow 2');

			const details = [
				createGenerationDetail({ workflow: workflow1, primaryPasses: 3 }),
				createGenerationDetail({ workflow: workflow2, primaryPasses: 1 }),
			];

			const result = aggregateGenerations(details);

			expect(result.generationDetails).toHaveLength(2);
			expect(result.generationDetails[0].workflow.name).toBe('Workflow 1');
			expect(result.generationDetails[0].primaryPasses).toBe(3);
			expect(result.generationDetails[1].workflow.name).toBe('Workflow 2');
			expect(result.generationDetails[1].primaryPasses).toBe(1);
		});
	});
});

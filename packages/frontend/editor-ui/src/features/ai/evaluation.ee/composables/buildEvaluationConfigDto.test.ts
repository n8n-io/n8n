import { describe, it, expect } from 'vitest';
import { buildEvaluationConfigDto } from './buildEvaluationConfigDto';
import type { BuildDtoInput } from './buildEvaluationConfigDto';

const BASE_INPUT: BuildDtoInput = {
	workflowName: 'My Workflow',
	upstreamNodeName: 'Eval Trigger',
	startNodeName: 'Start',
	endNodeName: 'End',
	inputFieldNames: ['query'],
	selectedMetrics: [],
	judgeSelectionByMetric: {},
	customChecks: [],
	dataTableId: 'table-123',
};

// The upstream node column expression form expected for expectedAnswer.
const EXPECTED_ANSWER_EXPR = `={{ $('Eval Trigger').first().json[${JSON.stringify('expectedAnswer')}] }}`;

// The endAnswer expression form expected for actualAnswer in string-comparison metrics.
const END_ANSWER_EXPR = `={{ (() => { const j = $('End').first().json; if (j === null || j === undefined) return ''; if (typeof j !== 'object') return String(j); const p = j.output ?? j.text ?? j.response; if (p !== undefined && p !== null) return typeof p === 'object' ? JSON.stringify(p) : String(p); const ks = Object.keys(j); if (ks.length === 1) { const o = j[ks[0]]; return typeof o === 'object' && o !== null ? JSON.stringify(o) : String(o); } return JSON.stringify(j); })() }}`;

// The legacy full-stringify form that must NOT be used for these metrics.
const END_OUTPUT_AS_STRING = `={{ JSON.stringify($('End').first().json) }}`;

describe('buildEvaluationConfigDto', () => {
	describe('stringSimilarity metric', () => {
		const input: BuildDtoInput = {
			...BASE_INPUT,
			selectedMetrics: ['stringSimilarity'],
		};

		it('returns ok: true', () => {
			const result = buildEvaluationConfigDto(input);
			expect(result.ok).toBe(true);
		});

		it('produces a string_similarity metric type', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			expect(result.dto.metrics).toHaveLength(1);
			expect(result.dto.metrics[0].type).toBe('string_similarity');
		});

		it('uses the extracted endAnswer expression for actualAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toBe(END_ANSWER_EXPR);
		});

		it('does NOT use the full JSON.stringify form for actualAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).not.toBe(END_OUTPUT_AS_STRING);
		});

		it('uses the dataset column expression for expectedAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.expectedAnswer).toBe(EXPECTED_ANSWER_EXPR);
		});

		it('includes .output ?? in actualAnswer expression', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toContain('.output ??');
		});

		it('includes a single-key object fallback in actualAnswer expression', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toContain('Object.keys(j)');
			expect(metric.config.inputs.actualAnswer).toContain('ks.length === 1');
		});

		it('JSON.stringifies object-valued preferred fields (no [object Object])', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toContain(
				"typeof p === 'object' ? JSON.stringify(p) : String(p)",
			);
		});
	});

	describe('categorization metric', () => {
		const input: BuildDtoInput = {
			...BASE_INPUT,
			selectedMetrics: ['categorization'],
		};

		it('returns ok: true', () => {
			const result = buildEvaluationConfigDto(input);
			expect(result.ok).toBe(true);
		});

		it('produces a categorization metric type', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			expect(result.dto.metrics).toHaveLength(1);
			expect(result.dto.metrics[0].type).toBe('categorization');
		});

		it('uses the extracted endAnswer expression for actualAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'categorization') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toBe(END_ANSWER_EXPR);
		});

		it('does NOT use the full JSON.stringify form for actualAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'categorization') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).not.toBe(END_OUTPUT_AS_STRING);
		});

		it('uses the dataset column expression for expectedAnswer', () => {
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'categorization') throw new Error('Wrong type');
			expect(metric.config.inputs.expectedAnswer).toBe(EXPECTED_ANSWER_EXPR);
		});
	});

	describe('node name escaping in endAnswer', () => {
		it('escapes single quotes in the end node name', () => {
			const input: BuildDtoInput = {
				...BASE_INPUT,
				endNodeName: "Customer's End",
				selectedMetrics: ['stringSimilarity'],
			};
			const result = buildEvaluationConfigDto(input);
			if (!result.ok) throw new Error('Expected ok result');
			const metric = result.dto.metrics[0];
			if (metric.type !== 'string_similarity') throw new Error('Wrong type');
			expect(metric.config.inputs.actualAnswer).toContain("Customer\\'s End");
		});
	});

	describe('returns ok: false', () => {
		it('when no metrics are selected', () => {
			const result = buildEvaluationConfigDto({ ...BASE_INPUT, selectedMetrics: [] });
			expect(result.ok).toBe(false);
		});
	});
});

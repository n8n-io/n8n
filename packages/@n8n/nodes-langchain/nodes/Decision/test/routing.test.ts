import type { INode, INodeParameters } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { configuredOutputs } from '../Decision.node';
import { branchCount, buildRoutingPlan, resolveBranch } from '../routing';
import type { QuestionParameter } from '../types';

const node = mock<INode>({ name: 'Decision', type: 'decision' });

const choiceQuestion: QuestionParameter = {
	id: 'department',
	type: 'choice',
	instructions: 'Which team should handle this request?',
	options: {
		option: [
			{ value: 'billing', description: 'Payments and refunds' },
			{ value: 'technical' },
			{ value: 'sales' },
		],
	},
};

const scoreQuestion: QuestionParameter = {
	id: 'severity',
	type: 'score',
	instructions: 'How severe?',
	levels: { level: [{ description: 'Low' }, { description: 'Critical' }] },
};

/** The outputs run in the expression sandbox, so they see untyped parameters. */
const params = (parameters: {
	outputMode?: string;
	questions?: { question: QuestionParameter[] };
	options?: { confidenceThreshold?: number };
}) => parameters as INodeParameters;

describe('configuredOutputs', () => {
	it('should give one output in single mode', () => {
		expect(
			configuredOutputs(
				params({ outputMode: 'single', questions: { question: [choiceQuestion] } }),
			),
		).toEqual([{ type: 'main', displayName: 'Decisions' }]);
	});

	it('should default to one output when the mode is unset', () => {
		// Keeps a node saved before this option existed on one output
		expect(configuredOutputs(params({ questions: { question: [choiceQuestion] } }))).toEqual([
			{ type: 'main', displayName: 'Decisions' },
		]);
	});

	it('should give one output for each option in branch mode', () => {
		expect(
			configuredOutputs(
				params({ outputMode: 'branch', questions: { question: [choiceQuestion] } }),
			),
		).toEqual([
			{ type: 'main', displayName: 'billing' },
			{ type: 'main', displayName: 'technical' },
			{ type: 'main', displayName: 'sales' },
		]);
	});

	it('should keep the configured option order', () => {
		const reordered: QuestionParameter = {
			...choiceQuestion,
			options: { option: [{ value: 'sales' }, { value: 'billing' }] },
		};

		expect(
			configuredOutputs(params({ outputMode: 'branch', questions: { question: [reordered] } })),
		).toEqual([
			{ type: 'main', displayName: 'sales' },
			{ type: 'main', displayName: 'billing' },
		]);
	});

	it('should ignore other question types when building the outputs', () => {
		expect(
			configuredOutputs(
				params({
					outputMode: 'branch',
					questions: { question: [scoreQuestion, choiceQuestion] },
				}),
			),
		).toHaveLength(3);
	});

	it('should add a Low Confidence output when a threshold is set', () => {
		expect(
			configuredOutputs(
				params({
					outputMode: 'branch',
					questions: { question: [choiceQuestion] },
					options: { confidenceThreshold: 0.8 },
				}),
			),
		).toEqual([
			{ type: 'main', displayName: 'billing' },
			{ type: 'main', displayName: 'technical' },
			{ type: 'main', displayName: 'sales' },
			{ type: 'main', displayName: 'Low Confidence' },
		]);
	});

	it('should not add a Low Confidence output for a threshold of 0', () => {
		expect(
			configuredOutputs(
				params({
					outputMode: 'branch',
					questions: { question: [choiceQuestion] },
					options: { confidenceThreshold: 0 },
				}),
			),
		).toHaveLength(3);
	});

	it('should trim and drop blank option values', () => {
		expect(
			configuredOutputs(
				params({
					outputMode: 'branch',
					questions: {
						question: [
							{
								...choiceQuestion,
								options: { option: [{ value: '  billing  ' }, { value: ' ' }] },
							},
						],
					},
				}),
			),
		).toEqual([{ type: 'main', displayName: 'billing' }]);
	});

	it.each([
		['no questions', []],
		['no choice question', [scoreQuestion]],
		['two choice questions', [choiceQuestion, { ...choiceQuestion, id: 'team' }]],
		['a choice question without options', [{ ...choiceQuestion, options: { option: [] } }]],
	])('should fall back to one output while the config has %s', (_case, questions) => {
		// Keeps existing connections while a user edits the node
		expect(
			configuredOutputs(params({ outputMode: 'branch', questions: { question: questions } })),
		).toEqual([{ type: 'main', displayName: 'Decisions' }]);
	});
});

describe('buildRoutingPlan', () => {
	it('should plan one branch for each option', () => {
		expect(buildRoutingPlan([choiceQuestion, scoreQuestion], undefined, node)).toEqual({
			questionId: 'department',
			optionValues: ['billing', 'technical', 'sales'],
		});
	});

	it('should plan a low confidence branch for a threshold', () => {
		const plan = buildRoutingPlan([choiceQuestion], 0.8, node);

		expect(plan.lowConfidenceIndex).toBe(3);
		expect(plan.confidenceThreshold).toBe(0.8);
		expect(branchCount(plan)).toBe(4);
	});

	it('should not plan a low confidence branch for a threshold of 0', () => {
		const plan = buildRoutingPlan([choiceQuestion], 0, node);

		expect(plan.lowConfidenceIndex).toBeUndefined();
		expect(branchCount(plan)).toBe(3);
	});

	it('should reject a node without a choice question', () => {
		expect(() => buildRoutingPlan([scoreQuestion], undefined, node)).toThrow(
			'Branch by Choice needs a choice question',
		);
	});

	it('should reject more than one choice question', () => {
		expect(() =>
			buildRoutingPlan([choiceQuestion, { ...choiceQuestion, id: 'team' }], undefined, node),
		).toThrow('Branch by Choice needs exactly one choice question');
	});

	it('should name the competing questions', () => {
		expect(() =>
			buildRoutingPlan([choiceQuestion, { ...choiceQuestion, id: 'team' }], undefined, node),
		).toThrow(
			expect.objectContaining({ description: expect.stringContaining('“department”, “team”') }),
		);
	});

	it('should reject a choice question without options', () => {
		expect(() =>
			buildRoutingPlan(
				[{ ...choiceQuestion, options: { option: [{ value: ' ' }] } }],
				undefined,
				node,
			),
		).toThrow('The choice question has no options to branch on');
	});
});

describe('resolveBranch', () => {
	const plan = buildRoutingPlan([choiceQuestion], undefined, node);
	const thresholdPlan = buildRoutingPlan([choiceQuestion], 0.8, node);

	it.each([
		['billing', 0],
		['technical', 1],
		['sales', 2],
	])('should route %s to output %s', (value, expected) => {
		expect(resolveBranch(plan, { department: { type: 'choice', value } }, node, 0)).toBe(expected);
	});

	it('should route a confident answer to its option', () => {
		expect(
			resolveBranch(
				thresholdPlan,
				{ department: { type: 'choice', value: 'billing', confidence: 0.92 } },
				node,
				0,
			),
		).toBe(0);
	});

	it('should route an answer below the threshold to Low Confidence', () => {
		expect(
			resolveBranch(
				thresholdPlan,
				{ department: { type: 'choice', value: 'billing', confidence: 0.4 } },
				node,
				0,
			),
		).toBe(3);
	});

	it('should treat a confidence equal to the threshold as confident', () => {
		expect(
			resolveBranch(
				thresholdPlan,
				{ department: { type: 'choice', value: 'billing', confidence: 0.8 } },
				node,
				0,
			),
		).toBe(0);
	});

	it('should route by value when the answer reports no confidence', () => {
		// Absent confidence is not doubt, so it must not become Low Confidence
		expect(
			resolveBranch(thresholdPlan, { department: { type: 'choice', value: 'sales' } }, node, 0),
		).toBe(2);
	});

	it('should reject a missing answer', () => {
		expect(() => resolveBranch(plan, {}, node, 2)).toThrow(
			'The model returned no choice for question “department”',
		);
	});

	it('should reject a value that is not an output', () => {
		expect(() =>
			resolveBranch(plan, { department: { type: 'choice', value: 'other' } }, node, 0),
		).toThrow("“other” is not one of this node's outputs");
	});
});

import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { buildDecisionRequest, buildState } from '../buildRequest';
import type { QuestionParameter } from '../types';

const node = mock<INode>({ name: 'Decision', type: 'decision' });

const choiceQuestion: QuestionParameter = {
	id: 'department',
	type: 'choice',
	instructions: 'Which team should handle this request?',
	options: {
		option: [
			{ value: 'billing', description: 'Payments, invoices, and refunds' },
			{ value: 'technical', description: 'Errors and integration problems' },
			{ value: 'other' },
		],
	},
};

const scoreQuestion: QuestionParameter = {
	id: 'severity',
	type: 'score',
	instructions: 'How severe is the customer impact?',
	levels: {
		level: [
			{ description: 'Low impact' },
			{ description: 'Material impact' },
			{ description: 'Critical business impact' },
		],
	},
};

const booleanQuestion: QuestionParameter = {
	id: 'urgency',
	type: 'booleanProbability',
	instructions: 'This request requires urgent attention',
};

describe('buildState', () => {
	it('should keep a string as text', () => {
		expect(buildState('Charged twice', node, 0)).toBe('Charged twice');
	});

	it('should keep an object as JSON', () => {
		const state = { subject: 'Double charge', priority: 2 };
		expect(buildState(state, node, 0)).toBe(state);
	});

	it('should keep an array as JSON', () => {
		const state = [{ role: 'user', text: 'Help' }];
		expect(buildState(state, node, 0)).toBe(state);
	});

	it('should describe other values as text', () => {
		expect(buildState(42, node, 0)).toBe('42');
	});

	it.each([undefined, null, '', '   '])('should reject empty state %s', (state) => {
		expect(() => buildState(state, node, 0)).toThrow(/State is empty/);
	});
});

describe('buildDecisionRequest', () => {
	it('should build a choice question', () => {
		const request = buildDecisionRequest('Charged twice', [choiceQuestion], node, 0);

		expect(request).toEqual({
			state: 'Charged twice',
			questions: {
				department: {
					type: 'choice',
					instructions: 'Which team should handle this request?',
					options: [
						{ value: 'billing', description: 'Payments, invoices, and refunds' },
						{ value: 'technical', description: 'Errors and integration problems' },
						{ value: 'other' },
					],
				},
			},
		});
	});

	it('should build a score question with ordered levels', () => {
		const request = buildDecisionRequest('Charged twice', [scoreQuestion], node, 0);

		expect(request.questions.severity).toEqual({
			type: 'score',
			instructions: 'How severe is the customer impact?',
			levels: ['Low impact', 'Material impact', 'Critical business impact'],
		});
	});

	it('should build a boolean probability question without criteria', () => {
		const request = buildDecisionRequest('Charged twice', [booleanQuestion], node, 0);

		expect(request.questions.urgency).toEqual({
			type: 'booleanProbability',
			instructions: 'This request requires urgent attention',
		});
	});

	it('should build a boolean probability question with criteria', () => {
		const request = buildDecisionRequest(
			'Charged twice',
			[{ ...booleanQuestion, trueDescription: 'Needs attention today', falseDescription: '  ' }],
			node,
			0,
		);

		expect(request.questions.urgency).toEqual({
			type: 'booleanProbability',
			instructions: 'This request requires urgent attention',
			criteria: { true: 'Needs attention today' },
		});
	});

	it('should build several questions in one request', () => {
		const request = buildDecisionRequest(
			'Charged twice',
			[choiceQuestion, scoreQuestion, booleanQuestion],
			node,
			0,
		);

		expect(Object.keys(request.questions)).toEqual(['department', 'severity', 'urgency']);
	});

	it('should trim IDs and instructions', () => {
		const request = buildDecisionRequest(
			'Charged twice',
			[{ ...booleanQuestion, id: '  urgency  ', instructions: '  Is it urgent?  ' }],
			node,
			0,
		);

		expect(request.questions.urgency.instructions).toBe('Is it urgent?');
	});

	it('should reject an empty question list', () => {
		expect(() => buildDecisionRequest('Charged twice', [], node, 0)).toThrow(
			'At least one question must be defined',
		);
	});

	it('should reject a blank question ID', () => {
		expect(() =>
			buildDecisionRequest('Charged twice', [{ ...booleanQuestion, id: ' ' }], node, 0),
		).toThrow('Question 1 has no ID');
	});

	it('should reject duplicate question IDs', () => {
		expect(() =>
			buildDecisionRequest(
				'Charged twice',
				[choiceQuestion, { ...booleanQuestion, id: 'department' }],
				node,
				0,
			),
		).toThrow('Duplicate question ID “department”');
	});

	it('should reject missing instructions', () => {
		expect(() =>
			buildDecisionRequest('Charged twice', [{ ...booleanQuestion, instructions: '' }], node, 0),
		).toThrow('Question “urgency” has no instructions');
	});

	it('should reject a choice question without options', () => {
		expect(() =>
			buildDecisionRequest(
				'Charged twice',
				[{ ...choiceQuestion, options: { option: [{ value: '  ' }] } }],
				node,
				0,
			),
		).toThrow('Choice question “department” has no options');
	});

	it('should reject duplicate choice options', () => {
		expect(() =>
			buildDecisionRequest(
				'Charged twice',
				[
					{
						...choiceQuestion,
						options: { option: [{ value: 'billing' }, { value: 'billing' }] },
					},
				],
				node,
				0,
			),
		).toThrow('Choice question “department” has a duplicate option “billing”');
	});

	it('should reject a score question with fewer than two levels', () => {
		expect(() =>
			buildDecisionRequest(
				'Charged twice',
				[{ ...scoreQuestion, levels: { level: [{ description: 'Low impact' }] } }],
				node,
				0,
			),
		).toThrow('Score question “severity” needs at least 2 rubric levels');
	});

	it('should reject an unsupported question type', () => {
		expect(() =>
			buildDecisionRequest(
				'Charged twice',
				[{ id: 'mood', type: 'sentiment' as never, instructions: 'How do they feel?' }],
				node,
				0,
			),
		).toThrow('Question “mood” has an unsupported type “sentiment”');
	});

	it('should report the item index on failure', () => {
		expect.assertions(2);
		try {
			buildDecisionRequest('Charged twice', [], node, 3);
		} catch (error) {
			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as NodeOperationError).context.itemIndex).toBe(3);
		}
	});
});

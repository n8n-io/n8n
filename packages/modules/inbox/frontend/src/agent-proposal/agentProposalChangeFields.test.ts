import type { AgentProposalEvalCase } from '@n8n/api-types';

import { evalCaseFields, fieldChange, splitExpectedTools } from './agentProposalChangeFields';

const formatTools = (tools: string[]) => tools.join(', ');

const evalCase = (overrides: Partial<AgentProposalEvalCase> = {}): AgentProposalEvalCase => ({
	caseKey: 'case-1',
	change: 'added',
	caseId: null,
	before: null,
	motivating: false,
	input: 'Where is order 42?',
	criteria: 'The answer gives the order status.',
	expectedTools: ['lookup_order', '!search_web'],
	...overrides,
});

describe('splitExpectedTools', () => {
	it('should separate the forbidden tools from the required tools', () => {
		expect(splitExpectedTools(['lookup_order', '!search_web', 'send_email'])).toEqual({
			required: ['lookup_order', 'send_email'],
			forbidden: ['search_web'],
		});
	});
});

describe('fieldChange', () => {
	it('should mark the words that changed on each side', () => {
		const change = fieldChange('value', 'Find a customer order', 'Find a customer invoice');

		expect(change.before?.filter(({ changed }) => changed).map(({ text }) => text)).toEqual([
			'order',
		]);
		expect(change.after?.filter(({ changed }) => changed).map(({ text }) => text)).toEqual([
			'invoice',
		]);
	});

	it('should give no marks when the before side has no value', () => {
		expect(fieldChange('value', null, 'A new description')).toEqual({
			field: 'value',
			before: null,
			after: [{ text: 'A new description', changed: false }],
		});
	});
});

describe('evalCaseFields', () => {
	it('should give all fields of an added case', () => {
		const fields = evalCaseFields(evalCase(), formatTools);

		expect(fields.map(({ field }) => field)).toEqual(['input', 'criteria', 'expectedTools']);
		expect(fields.every(({ before }) => before === null)).toBe(true);
	});

	it('should not give the empty fields of an added case', () => {
		const fields = evalCaseFields(evalCase({ criteria: null }), formatTools);

		expect(fields.map(({ field }) => field)).toEqual(['input', 'expectedTools']);
	});

	it('should give only the changed fields of an updated case', () => {
		const fields = evalCaseFields(
			evalCase({
				change: 'updated',
				caseId: 'dataset:1',
				before: {
					input: 'Where is order 42?',
					criteria: 'The answer gives the order status.',
					expectedTools: [],
				},
			}),
			formatTools,
		);

		expect(fields).toEqual([
			{
				field: 'expectedTools',
				before: null,
				after: [{ text: 'lookup_order, !search_web', changed: false }],
			},
		]);
	});

	it('should give a removed rule of an updated case with an empty after side', () => {
		const fields = evalCaseFields(
			evalCase({
				change: 'updated',
				caseId: 'dataset:1',
				criteria: null,
				before: {
					input: 'Where is order 42?',
					criteria: 'The answer gives the order status.',
					expectedTools: ['lookup_order', '!search_web'],
				},
			}),
			formatTools,
		);

		expect(fields).toEqual([
			{
				field: 'criteria',
				before: [{ text: 'The answer gives the order status.', changed: false }],
				after: null,
			},
		]);
	});

	it('should give all fields of an updated case when no field changed', () => {
		const fields = evalCaseFields(
			evalCase({
				change: 'updated',
				caseId: 'dataset:1',
				before: {
					input: 'Where is order 42?',
					criteria: 'The answer gives the order status.',
					expectedTools: ['lookup_order', '!search_web'],
				},
			}),
			formatTools,
		);

		expect(fields.map(({ field }) => field)).toEqual(['input', 'criteria', 'expectedTools']);
		expect(fields.flatMap(({ after }) => after ?? []).some(({ changed }) => changed)).toBe(false);
	});
});

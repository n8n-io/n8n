import type { z } from 'zod';

import { evaluateWorkflowRules } from '../evaluate';
import { resolveEffectiveRules } from '../merge';
import { customRuleSchema, ruleSetSchema } from '../schema';
import type { RuleWorkflow } from '../types';

type CustomRuleInput = Omit<z.input<typeof customRuleSchema>, 'id' | 'name' | 'severity'> & {
	id?: string;
};

const base = {
	id: 'custom-rule',
	name: 'Rule',
	severity: 'warn' as const,
};

const wf: RuleWorkflow = {
	name: 'Billing sync',
	description: '',
	settings: { saveDataErrorExecution: 'all' },
	nodes: [
		{
			id: '1',
			name: 'Fetch',
			type: 'n8n-nodes-base.httpRequest',
			parameters: { options: { timeout: 5000 } },
			credentials: { httpHeaderAuth: { id: 'c1' } },
		},
		{ id: '2', name: 'Transform', type: 'n8n-nodes-base.code', retryOnFail: true },
	],
};

function names(rule: CustomRuleInput) {
	const rules = resolveEffectiveRules(ruleSetSchema.parse({ customRules: [{ ...base, ...rule }] }));
	return evaluateWorkflowRules(wf, rules).findings.map((finding) => finding.nodeName ?? 'workflow');
}

describe('custom rules', () => {
	it('checks a node parameter by path on the selected node types', () => {
		expect(
			names({
				target: { kind: 'nodes', nodeTypes: ['n8n-nodes-base.httpRequest'] },
				require: {
					subject: 'parameter',
					path: 'options.timeout',
					operator: 'lessThan',
					value: 1000,
				},
			}),
		).toEqual(['Fetch']);
	});

	it('forbids a node type across all nodes', () => {
		expect(
			names({
				target: { kind: 'nodes', nodeTypes: [] },
				require: { subject: 'nodeType', operator: 'notOneOf', value: ['n8n-nodes-base.code'] },
			}),
		).toEqual(['Transform']);
	});

	it('reads credential types and booleans', () => {
		expect(
			names({
				target: { kind: 'nodes', nodeTypes: [] },
				require: { subject: 'credentialType', operator: 'oneOf', value: ['httpHeaderAuth'] },
			}),
		).toEqual(['Transform']);
		expect(
			names({
				target: { kind: 'nodes', nodeTypes: [] },
				require: { subject: 'retryOnFail', operator: 'equals', value: true },
			}),
		).toEqual(['Fetch']);
	});

	it('checks workflow subjects', () => {
		expect(
			names({
				target: { kind: 'workflow' },
				require: { subject: 'description', operator: 'isSet' },
			}),
		).toEqual(['workflow']);
		expect(
			names({
				target: { kind: 'workflow' },
				require: {
					subject: 'setting',
					path: 'saveDataErrorExecution',
					operator: 'equals',
					value: 'all',
				},
			}),
		).toEqual([]);
		expect(
			names({
				target: { kind: 'workflow' },
				require: { subject: 'workflowName', operator: 'matches', value: '^\\[\\w+\\]', flags: 'i' },
			}),
		).toEqual(['workflow']);
	});

	it('uses the admin message with placeholders', () => {
		const rules = resolveEffectiveRules(
			ruleSetSchema.parse({
				customRules: [
					{
						...base,
						target: { kind: 'nodes', nodeTypes: ['n8n-nodes-base.code'] },
						require: { subject: 'disabled', operator: 'equals', value: true },
						message: 'Turn off {node} in {workflow} before publishing',
					},
				],
			}),
		);
		expect(evaluateWorkflowRules(wf, rules).findings[0].message).toBe(
			'Turn off Transform in Billing sync before publishing',
		);
	});

	it('rejects requirements that do not fit the target or the operator', () => {
		const invalid: CustomRuleInput[] = [
			{
				...base,
				target: { kind: 'workflow' },
				require: { subject: 'nodeName', operator: 'isSet' },
			},
			{ ...base, target: { kind: 'nodes' }, require: { subject: 'parameter', operator: 'isSet' } },
			{
				...base,
				target: { kind: 'nodes' },
				require: { subject: 'nodeName', operator: 'oneOf', value: 'a' },
			},
			{
				...base,
				target: { kind: 'nodes' },
				require: { subject: 'nodeName', operator: 'matches', value: '(' },
			},
			{
				...base,
				id: 'Custom Rule',
				target: { kind: 'workflow' },
				require: { subject: 'workflowName', operator: 'isSet' },
			},
		];
		for (const rule of invalid) {
			expect(customRuleSchema.safeParse(rule).success).toBe(false);
		}
	});
});

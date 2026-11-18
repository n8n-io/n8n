import { resolveEffectiveRules } from '../merge';
import { ruleSetSchema, type RuleSetInput } from '../schema';

const set = (input: RuleSetInput) => ruleSetSchema.parse(input);

describe('resolveEffectiveRules', () => {
	it('drops rules that are off', () => {
		const rules = resolveEffectiveRules(
			set({ rules: [{ ruleId: 'no-disabled-nodes', severity: 'off' }] }),
		);
		expect(rules).toEqual([]);
	});

	it('lets a project raise a rule but not lower it', () => {
		const instance = set({
			rules: [
				{ ruleId: 'no-disabled-nodes', severity: 'warn' },
				{ ruleId: 'error-workflow-required', severity: 'block' },
			],
		});
		const project = set({
			rules: [
				{ ruleId: 'no-disabled-nodes', severity: 'block' },
				{ ruleId: 'error-workflow-required', severity: 'off' },
			],
		});
		const rules = resolveEffectiveRules(instance, project);
		expect(rules.map(({ ruleId, severity, scope }) => ({ ruleId, severity, scope }))).toEqual([
			{ ruleId: 'no-disabled-nodes', severity: 'block', scope: 'instance' },
			{ ruleId: 'error-workflow-required', severity: 'block', scope: 'instance' },
		]);
	});

	it('lets a project lower or turn off an adjustable rule', () => {
		const instance = set({
			rules: [
				{ ruleId: 'no-disabled-nodes', severity: 'block', adjustable: true },
				{ ruleId: 'max-nodes', severity: 'block', adjustable: true, options: { max: 20 } },
			],
		});
		const project = set({
			rules: [
				{ ruleId: 'no-disabled-nodes', severity: 'off' },
				{ ruleId: 'max-nodes', severity: 'warn', options: { max: 80 } },
			],
		});
		const rules = resolveEffectiveRules(instance, project);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toMatchObject({
			ruleId: 'max-nodes',
			severity: 'warn',
			options: { max: 80 },
			adjustedByProject: true,
		});
	});

	it('tightens options when both levels turn a rule on', () => {
		const instance = set({
			rules: [
				{
					ruleId: 'allowed-http-domains',
					severity: 'block',
					options: { domains: ['example.com', 'acme.io'] },
				},
				{ ruleId: 'max-nodes', severity: 'warn', options: { max: 50 } },
			],
		});
		const project = set({
			rules: [
				{
					ruleId: 'allowed-http-domains',
					severity: 'block',
					options: { domains: ['api.example.com', 'other.org'] },
				},
				{ ruleId: 'max-nodes', severity: 'warn', options: { max: 80 } },
			],
		});
		const [domains, size] = resolveEffectiveRules(instance, project);
		expect(domains).toMatchObject({ kind: 'catalogue', options: { domains: ['api.example.com'] } });
		expect(size).toMatchObject({ options: { max: 50 } });
	});

	it('keeps project-only rules as project scope', () => {
		const project = set({
			rules: [{ ruleId: 'no-disabled-nodes', severity: 'warn' }],
			customRules: [
				{
					id: 'custom-team-prefix',
					name: 'Team prefix',
					severity: 'warn',
					target: { kind: 'workflow' },
					require: { subject: 'workflowName', operator: 'contains', value: '[ops]' },
				},
			],
		});
		const rules = resolveEffectiveRules(set({}), project);
		expect(rules.map((rule) => rule.scope)).toEqual(['project', 'project']);
	});

	it('applies project severity to an instance custom rule', () => {
		const custom = {
			id: 'custom-no-code',
			name: 'No Code nodes',
			severity: 'warn' as const,
			target: { kind: 'nodes' as const, nodeTypes: [] },
			require: {
				subject: 'nodeType' as const,
				operator: 'notEquals' as const,
				value: 'n8n-nodes-base.code',
			},
		};
		const raised = resolveEffectiveRules(
			set({ customRules: [custom] }),
			set({ rules: [{ ruleId: 'custom-no-code', severity: 'block' }] }),
		);
		expect(raised[0]).toMatchObject({ severity: 'block', scope: 'instance' });

		const lowered = resolveEffectiveRules(
			set({ customRules: [custom] }),
			set({ rules: [{ ruleId: 'custom-no-code', severity: 'off' }] }),
		);
		expect(lowered[0]).toMatchObject({ severity: 'warn' });
	});
});

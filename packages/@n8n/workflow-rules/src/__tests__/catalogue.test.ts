import { evaluateWorkflowRules } from '../evaluate';
import { resolveEffectiveRules } from '../merge';
import type { RuleSetInput } from '../schema';
import { ruleSetSchema } from '../schema';
import type { RuleNode, RuleWorkflow } from '../types';

const http = (name: string, parameters: object = {}): RuleNode => ({
	id: name,
	name,
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	parameters,
});

const workflow = (nodes: RuleNode[], extra: Partial<RuleWorkflow> = {}): RuleWorkflow => ({
	name: 'Sync orders',
	nodes,
	...extra,
});

function run(wf: RuleWorkflow, ruleSet: RuleSetInput, options = {}) {
	const rules = resolveEffectiveRules(ruleSetSchema.parse(ruleSet));
	return evaluateWorkflowRules(wf, rules, options);
}

const only = (ruleId: string, options?: Record<string, unknown>) => ({
	rules: [{ ruleId, severity: 'block' as const, options }],
});

describe('http-request-credential', () => {
	it('reports an HTTP Request node without authentication', () => {
		const { findings } = run(workflow([http('Call API')]), only('http-request-credential'));
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({ nodeName: 'Call API', severity: 'block' });
	});

	it('accepts a predefined or generic credential', () => {
		const wf = workflow([
			http('A', { authentication: 'predefinedCredentialType' }),
			http('B', { authentication: 'genericCredentialType' }),
		]);
		expect(run(wf, only('http-request-credential')).findings).toHaveLength(0);
	});

	it('skips domains on the exception list', () => {
		const wf = workflow([http('Public', { url: 'https://api.status.example.com/v1' })]);
		const ruleSet = only('http-request-credential', { exceptDomains: ['example.com'] });
		expect(run(wf, ruleSet).findings).toHaveLength(0);
	});
});

describe('no-hardcoded-secrets', () => {
	it('reports a token in a header value', () => {
		const wf = workflow([
			http('Call API', {
				headerParameters: {
					parameters: [{ name: 'Authorization', value: 'Bearer abcdefghijklmnop' }],
				},
			}),
		]);
		const { findings } = run(wf, only('no-hardcoded-secrets'));
		expect(findings).toHaveLength(1);
		expect(findings[0].parameterPath).toBe('headerParameters.parameters[0].value');
	});

	it('reports a value under a sensitive pair name', () => {
		const wf = workflow([
			http('Call API', {
				queryParameters: { parameters: [{ name: 'api_key', value: 'abc123def456' }] },
			}),
		]);
		expect(run(wf, only('no-hardcoded-secrets')).findings).toHaveLength(1);
	});

	it('ignores expressions and option names that mention credentials', () => {
		const wf = workflow([
			http('Call API', {
				nodeCredentialType: 'httpHeaderAuth',
				headerParameters: { parameters: [{ name: 'Authorization', value: '={{ $json.token }}' }] },
			}),
		]);
		expect(run(wf, only('no-hardcoded-secrets')).findings).toHaveLength(0);
	});
});

describe('allowed-http-domains', () => {
	const ruleSet = only('allowed-http-domains', {
		domains: ['example.com'],
		allowExpressions: false,
	});

	it('reports a call to another domain and an expression URL', () => {
		const wf = workflow([
			http('Good', { url: 'https://api.example.com' }),
			http('Bad', { url: 'https://evil.test/collect' }),
			http('Dynamic', { url: '={{ $json.url }}' }),
		]);
		const names = run(wf, ruleSet).findings.map((finding) => finding.nodeName);
		expect(names).toEqual(['Bad', 'Dynamic']);
	});

	it('requires at least one domain when the rule is on', () => {
		const result = ruleSetSchema.safeParse(only('allowed-http-domains', { domains: [] }));
		expect(result.success).toBe(false);
	});
});

describe('workflow settings rules', () => {
	it('treats DEFAULT and expressions as no error workflow', () => {
		for (const errorWorkflow of [undefined, 'DEFAULT', '={{ 1 }}']) {
			const wf = workflow([], { settings: { errorWorkflow } });
			expect(run(wf, only('error-workflow-required')).findings).toHaveLength(1);
		}
		const wf = workflow([], { settings: { errorWorkflow: 'wf-1' } });
		expect(run(wf, only('error-workflow-required')).findings).toHaveLength(0);
	});

	it('checks the execution timeout against the instance default and the maximum', () => {
		const ruleSet = only('execution-timeout', { maxSeconds: 300 });
		expect(run(workflow([]), ruleSet).findings).toHaveLength(1);
		expect(
			run(workflow([]), ruleSet, { defaults: { executionTimeout: 120 } }).findings,
		).toHaveLength(0);
		const long = workflow([], { settings: { executionTimeout: 900 } });
		expect(run(long, ruleSet).findings[0].params).toEqual({ timeout: '900', max: '300' });
	});

	it('flags a callable workflow that any workflow can call', () => {
		const trigger: RuleNode = {
			name: 'When called',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
		};
		const open = workflow([trigger], { settings: { callerPolicy: 'any' } });
		expect(run(open, only('sub-workflow-caller-policy')).findings).toHaveLength(1);
		const notCallable = workflow([], { settings: { callerPolicy: 'any' } });
		expect(run(notCallable, only('sub-workflow-caller-policy')).findings).toHaveLength(0);
	});
});

describe('conventions and size', () => {
	it('checks every naming pattern', () => {
		const ruleSet = only('workflow-name-pattern', {
			patterns: [{ pattern: '^\\[[a-z]+\\] ', hint: '[team] Name' }],
		});
		expect(run(workflow([]), ruleSet).findings[0].params.expected).toBe('[team] Name');
		expect(run(workflow([], { name: '[ops] Sync orders' }), ruleSet).findings).toHaveLength(0);
	});

	it('reports default node names only when node names are known', () => {
		const wf = workflow([http('HTTP Request1'), http('Fetch orders')]);
		const ruleSet = only('node-name-not-default');
		expect(run(wf, ruleSet).findings).toHaveLength(0);
		const { findings } = run(wf, ruleSet, { getDefaultNodeName: () => 'HTTP Request' });
		expect(findings.map((finding) => finding.nodeName)).toEqual(['HTTP Request1']);
	});

	it('counts host nodes only and skips sticky notes', () => {
		const sticky: RuleNode = { name: 'Note', type: 'n8n-nodes-base.stickyNote' };
		const wf = workflow([http('A'), http('B'), sticky, http('Agent tool')], { hostNodeCount: 3 });
		expect(run(wf, only('max-nodes', { max: 2 })).findings).toHaveLength(0);
		expect(run(wf, only('max-nodes', { max: 1 })).findings).toHaveLength(1);
	});

	it('reports disabled nodes', () => {
		const wf = workflow([{ ...http('Old'), disabled: true }]);
		expect(run(wf, only('no-disabled-nodes')).findings[0].nodeName).toBe('Old');
	});
});

describe('evaluateWorkflowRules', () => {
	it('marks exempted findings', () => {
		const { findings } = run(workflow([http('A')]), only('http-request-credential'), {
			exemptedRuleIds: ['http-request-credential'],
		});
		expect(findings[0].exempted).toBe(true);
	});

	it('reports a rule that throws instead of failing the whole evaluation', () => {
		const throwing = {
			test: () => {
				throw new Error('Regular expression execution timed out');
			},
		};
		const ruleSet = {
			rules: [
				{
					ruleId: 'workflow-name-pattern',
					severity: 'warn' as const,
					options: { patterns: [{ pattern: 'x' }] },
				},
				{ ruleId: 'http-request-credential', severity: 'block' as const },
			],
		};
		const { findings, errors } = run(workflow([http('A')]), ruleSet, { regex: throwing });
		expect(errors).toEqual([
			{ ruleId: 'workflow-name-pattern', message: 'Regular expression execution timed out' },
		]);
		expect(findings).toHaveLength(1);
	});
});

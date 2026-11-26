import { effectiveAccess, projectRulesFor } from './effectiveAccess';
import type { PolicyRule, RequestFedPolicy } from '../../runtime-credentials.api';

const slack = { name: 'slackApi', ancestors: [] };
const slackOAuth = { name: 'slackOAuth2Api', ancestors: ['oAuth2Api'] };

const policy = (rules: PolicyRule[] = [], defaultAction: 'allow' | 'deny' = 'allow') =>
	({ rules, defaultAction, version: 1 }) satisfies RequestFedPolicy;

const rule = (
	action: PolicyRule['action'],
	kind: PolicyRule['selector']['kind'],
	value: string,
	id = `${action}-${kind}-${value}`,
): PolicyRule => ({ id, action, selector: { kind, value } });

describe('effectiveAccess', () => {
	it('allows when nothing is configured', () => {
		expect(effectiveAccess(policy(), policy(), slack)).toEqual({
			access: 'allow',
			deniedBy: null,
			canOptIn: false,
			exact: true,
		});
	});

	it('denies by the project when the project blocks the type', () => {
		const result = effectiveAccess(policy(), policy([rule('deny', 'name', 'slackApi')]), slack);

		expect(result).toMatchObject({ access: 'deny', deniedBy: 'project' });
	});

	it('cannot loosen an instance block, even with a project allow rule', () => {
		const result = effectiveAccess(
			policy([rule('deny', 'name', 'slackApi')]),
			policy([rule('allow', 'name', 'slackApi')]),
			slack,
		);

		expect(result).toMatchObject({ access: 'deny', deniedBy: 'instance', canOptIn: false });
	});

	it('matches an extends selector through the ancestors', () => {
		const instance = policy([rule('deny', 'extends', 'oAuth2Api')]);

		expect(effectiveAccess(instance, policy(), slackOAuth)).toMatchObject({ deniedBy: 'instance' });
		expect(effectiveAccess(instance, policy(), slack).access).toBe('allow');
	});

	it('applies the first matching rule', () => {
		const project = policy([rule('allow', 'name', 'slackApi'), rule('deny', 'name', 'slackApi')]);

		expect(effectiveAccess(null, project, slack).access).toBe('allow');
	});

	it('needs an explicit project allow when the instance delegates', () => {
		const instance = policy([rule('delegate', 'name', 'slackApi')]);

		expect(effectiveAccess(instance, policy(), slack)).toMatchObject({
			access: 'deny',
			deniedBy: 'instance',
			canOptIn: true,
		});
		expect(
			effectiveAccess(instance, policy([rule('allow', 'name', 'slackApi')]), slack),
		).toMatchObject({ access: 'allow', canOptIn: false });
	});

	it('reports a project denial of a delegated type as the project decision', () => {
		const instance = policy([rule('delegate', 'name', 'slackApi')]);
		const project = policy([rule('deny', 'name', 'slackApi')]);

		expect(effectiveAccess(instance, project, slack)).toMatchObject({
			deniedBy: 'project',
			canOptIn: true,
		});
	});

	it('uses only the project policy when the instance policy is unknown', () => {
		expect(effectiveAccess(null, policy([], 'deny'), slack)).toMatchObject({
			access: 'deny',
			deniedBy: 'project',
		});
	});

	it('is not exact when a package rule could change the result', () => {
		const project = policy([rule('deny', 'package', 'n8n-nodes-base')]);

		expect(effectiveAccess(null, project, slack)).toMatchObject({ access: 'allow', exact: false });
	});

	it('stays exact when a package rule has the same action as the result', () => {
		const project = policy([rule('allow', 'package', 'n8n-nodes-base')]);

		expect(effectiveAccess(null, project, slack).exact).toBe(true);
	});
});

describe('projectRulesFor', () => {
	const newId = () => 'new-id';

	it('adds a deny rule for an allowed type', () => {
		const rules = projectRulesFor(policy(), policy(), slack, 'deny', newId);

		expect(rules).toEqual([rule('deny', 'name', 'slackApi', 'new-id')]);
	});

	it('removes the deny rule to allow a type again', () => {
		const project = policy([rule('deny', 'name', 'slackApi'), rule('deny', 'name', 'other')]);

		expect(projectRulesFor(policy(), project, slack, 'allow', newId)).toEqual([
			rule('deny', 'name', 'other'),
		]);
	});

	it('puts an allow rule first when a broader rule still blocks the type', () => {
		const broad = rule('deny', 'extends', 'oAuth2Api');
		const rules = projectRulesFor(policy(), policy([broad]), slackOAuth, 'allow', newId);

		expect(rules).toEqual([rule('allow', 'name', 'slackOAuth2Api', 'new-id'), broad]);
	});

	it('adds an allow rule to opt in to a delegated type', () => {
		const instance = policy([rule('delegate', 'name', 'slackApi')]);

		expect(projectRulesFor(instance, policy(), slack, 'allow', newId)).toEqual([
			rule('allow', 'name', 'slackApi', 'new-id'),
		]);
	});
});

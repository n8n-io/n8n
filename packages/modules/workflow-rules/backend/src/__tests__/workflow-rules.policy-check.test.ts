import type { PolicedWorkflow, PolicedWorkflowContent } from '@n8n/decorators';
import { ruleSetSchema, type RuleSetInput } from '@n8n/workflow-rules';
import type { INode, INodeParameters } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowRulesContext } from '../workflow-rules-context';
import { WorkflowRulesPolicyCheck } from '../workflow-rules.policy-check';
import { WorkflowRulesService } from '../workflow-rules.service';
import type { WorkflowRulesState } from '../workflow-rules.snapshot';

const httpNode = (name: string, parameters: INodeParameters = {}): INode => ({
	id: name,
	name,
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [0, 0],
	parameters,
});

const workflow = (
	overrides: Partial<PolicedWorkflow & PolicedWorkflowContent> = {},
): PolicedWorkflow & PolicedWorkflowContent => ({
	id: 'wf-1',
	name: 'Sync orders',
	nodes: [httpNode('Call API')],
	settings: null,
	connections: null,
	description: null,
	...overrides,
});

function setup(
	instance: RuleSetInput,
	{
		projects = {},
		exemptions = {},
	}: {
		projects?: Record<string, RuleSetInput>;
		exemptions?: Record<string, string[]>;
	} = {},
) {
	const state: WorkflowRulesState = {
		instance: { ruleSet: ruleSetSchema.parse(instance), version: 3 },
		projects: new Map(
			Object.entries(projects).map(([id, set]) => [
				id,
				{ ruleSet: ruleSetSchema.parse(set), version: 1 },
			]),
		),
		exemptions: new Map(Object.entries(exemptions).map(([id, ruleIds]) => [id, new Set(ruleIds)])),
	};
	// The real service methods are pure over the state, so only `readState` is stubbed.
	const service = new WorkflowRulesService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	vi.spyOn(service, 'readState').mockResolvedValue(state);
	const context = mock<WorkflowRulesContext>();
	context.evaluateOptions.mockImplementation((exempted = []) => ({
		exemptedRuleIds: [...exempted],
		defaults: {},
	}));
	return new WorkflowRulesPolicyCheck(service, context);
}

const credentialRule = {
	rules: [{ ruleId: 'http-request-credential', severity: 'block' as const }],
};

describe('WorkflowRulesPolicyCheck', () => {
	it('refuses a publish with a blocking finding and names the node and the rule', async () => {
		const check = setup(credentialRule);

		const result = await check.onWorkflowPublish({
			workflow: workflow(),
			projectId: 'project-1',
			republish: false,
		});

		expect(result.violations).toEqual([
			expect.objectContaining({
				kind: 'workflow-rule',
				checkId: 'workflow-rules',
				subject: 'Call API',
				subjectType: 'node',
				scope: 'instance',
				matchedRuleId: 'http-request-credential',
				projectId: 'project-1',
			}),
		]);
		expect(result.policyVersions).toEqual([{ scope: 'instance', version: 3 }]);
	});

	it('never refuses a republish, so a restart cannot stop a live workflow', async () => {
		const check = setup(credentialRule);

		const result = await check.onWorkflowPublish({
			workflow: workflow(),
			projectId: 'project-1',
			republish: true,
		});

		expect(result.violations).toEqual([]);
	});

	it('does not refuse for warnings or exempted rules', async () => {
		const warnOnly = setup({ rules: [{ ruleId: 'http-request-credential', severity: 'warn' }] });
		const exempted = setup(credentialRule, { exemptions: { 'wf-1': ['http-request-credential'] } });
		const context = { workflow: workflow(), projectId: 'project-1', republish: false };

		expect((await warnOnly.onWorkflowPublish(context)).violations).toEqual([]);
		expect((await exempted.onWorkflowPublish(context)).violations).toEqual([]);
	});

	it('applies the project rules of the workflow being imported', async () => {
		const check = setup(
			{},
			{
				projects: {
					'project-2': { rules: [{ ruleId: 'error-workflow-required', severity: 'block' }] },
				},
			},
		);

		const blocked = await check.onContentImport({
			workflow: workflow({ nodes: [] }),
			projectId: 'project-2',
			transport: 'source-control',
		});
		const otherProject = await check.onContentImport({
			workflow: workflow({ nodes: [] }),
			projectId: 'project-3',
			transport: 'source-control',
		});

		expect(blocked.violations).toEqual([
			expect.objectContaining({
				subject: 'Sync orders',
				subjectType: 'workflow',
				scope: 'project',
			}),
		]);
		expect(otherProject.violations).toEqual([]);
	});

	it('ignores agents and credential imports', async () => {
		const check = setup(credentialRule);

		const agent = await check.onWorkflowPublish({
			workflow: workflow({ artifactKind: 'agent' }),
			projectId: 'project-1',
			republish: false,
		});
		const credential = await check.onContentImport({
			credential: { id: 'c1', type: 'httpHeaderAuth' },
			projectId: 'project-1',
			transport: 'cli',
		});

		expect(agent.violations).toEqual([]);
		expect(credential.violations).toEqual([]);
	});
});

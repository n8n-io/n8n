import type { EnforcementPoint } from '@n8n/decorators';

import type { PolicyContext } from '@/policy/policy-enforcement-backend';

import { decisionAudit } from '../policy-decision-audit';

type TargetCase<Point extends EnforcementPoint> = {
	context: PolicyContext<Point>;
	target: Record<string, unknown>;
};

const workflow = { id: 'wf-1', name: 'My workflow', nodes: [] };
const agent = { id: 'agent-1', name: 'Support agent', nodes: [], artifactKind: 'agent' as const };
const credential = { id: 'cred-1', type: 'slackApi' };

/** One case per point, so a new point cannot ship without a pinned audit target. */
const targets = {
	workflowSave: {
		context: {
			workflow: { ...workflow, id: 'payload-id' },
			storedWorkflow: workflow,
			projectId: 'proj-1',
		},
		target: { workflowId: 'wf-1', workflowName: 'My workflow', projectId: 'proj-1' },
	},
	workflowPublish: {
		context: { workflow, projectId: 'proj-1' },
		target: { workflowId: 'wf-1', workflowName: 'My workflow', projectId: 'proj-1' },
	},
	workflowStart: {
		context: { workflow: agent, projectId: null },
		target: { agentId: 'agent-1', agentName: 'Support agent', projectId: null },
	},
	workflowTransfer: {
		context: { workflow, targetProjectId: 'proj-2' },
		target: { workflowId: 'wf-1', workflowName: 'My workflow', projectId: 'proj-2' },
	},
	credentialSave: {
		context: {
			credential: { id: 'payload-id', type: 'slackApi' },
			storedCredential: credential,
			projectId: 'proj-1',
		},
		target: { credentialId: 'cred-1', credentialType: 'slackApi', projectId: 'proj-1' },
	},
	credentialTransfer: {
		context: { credential, targetProjectId: 'proj-2' },
		target: { credentialId: 'cred-1', credentialType: 'slackApi', projectId: 'proj-2' },
	},
	credentialDecrypt: {
		context: {
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			consumer: { nodeType: 'n8n-nodes-base.slack' },
			projectId: 'proj-1',
		},
		target: {
			credentialId: 'cred-1',
			credentialType: 'slackApi',
			consumerNodeType: 'n8n-nodes-base.slack',
			projectId: 'proj-1',
		},
	},
	contentImport: {
		context: { workflow: { ...workflow, id: null }, projectId: 'proj-1', transport: 'cli' },
		target: { workflowId: null, workflowName: 'My workflow', projectId: 'proj-1' },
	},
} satisfies { [Point in EnforcementPoint]: TargetCase<Point> };

const extraCases: [string, EnforcementPoint, TargetCase<EnforcementPoint>][] = [
	[
		'a workflow create, ignoring the id on the payload',
		'workflowSave',
		{
			context: {
				workflow: { ...workflow, id: 'payload-id' },
				storedWorkflow: null,
				projectId: null,
			},
			target: { workflowId: null, workflowName: 'My workflow', projectId: null },
		},
	],
	[
		'a credential create',
		'credentialSave',
		{
			context: {
				credential: { id: null, type: 'slackApi' },
				storedCredential: null,
				projectId: null,
			},
			target: { credentialId: null, credentialType: 'slackApi', projectId: null },
		},
	],
	[
		'a decrypt with no node asking',
		'credentialDecrypt',
		{
			context: {
				credentialType: 'slackApi',
				credentialId: 'cred-1',
				consumer: null,
				projectId: null,
			},
			target: {
				credentialId: 'cred-1',
				credentialType: 'slackApi',
				consumerNodeType: undefined,
				projectId: null,
			},
		},
	],
	[
		'a credential import',
		'contentImport',
		{
			context: { credential, projectId: 'proj-1', transport: 'source-control' },
			target: { credentialId: 'cred-1', credentialType: 'slackApi', projectId: 'proj-1' },
		},
	],
];

const targetOfLine = (point: EnforcementPoint, context: PolicyContext<EnforcementPoint>) => {
	const { outcome, durationMs, checkIds, violations, policyVersions, ...target } = decisionAudit({
		point,
		context,
		decision: { violations: [] },
		durationMs: 0,
		checkIds: [],
	});

	return target;
};

describe('decisionAudit target', () => {
	test.each(Object.entries(targets))('records the target of %s', (point, { context, target }) => {
		expect(targetOfLine(point as EnforcementPoint, context)).toStrictEqual({ point, ...target });
	});

	test.each(extraCases)('records the target of %s', (_, point, { context, target }) => {
		expect(targetOfLine(point, context)).toStrictEqual({ point, ...target });
	});
});

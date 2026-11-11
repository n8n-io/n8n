import {
	createManyWorkflows,
	createWorkflow,
	createWorkflowHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import type { INode } from 'n8n-workflow';

import { EngineEligibilityReport } from '@/commands/engine/eligibility-report';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
loadNodesAndCredentials.collectTypes.mockResolvedValue({ nodes: [], credentials: [] });

const command = setupTestCommand(EngineEligibilityReport);

const manualTrigger: INode = {
	id: 'manual',
	name: 'Manual Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const oauthWebhook: INode = {
	id: 'webhook',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { authentication: 'n8nOAuth2' },
};

let stdout: string;

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
	stdout = '';
	vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		stdout += String(chunk);
		return true;
	});
});

test('counts eligible workflows and the workflows for each reason code, without archived workflows', async () => {
	await createWorkflow({ nodes: [manualTrigger] });
	await createWorkflow({ nodes: [manualTrigger], settings: { redactionPolicy: 'all' } });
	await createWorkflow({
		nodes: [manualTrigger],
		settings: { redactionPolicy: 'all', errorWorkflow: 'error-workflow-id' },
	});
	await createWorkflow({
		nodes: [manualTrigger],
		settings: { errorWorkflow: 'error-workflow-id' },
		isArchived: true,
	});

	await command.run(['--json']);

	expect(JSON.parse(stdout)).toEqual({
		total: 3,
		eligible: 1,
		eligiblePercent: 33.3,
		published: { total: 0, eligible: 0 },
		reasons: { REDACTION_POLICY: 2, ERROR_WORKFLOW: 1 },
	});
});

test('checks the published version of a published workflow instead of its draft', async () => {
	const published = await createWorkflow({ nodes: [manualTrigger] });
	await createWorkflowHistory(published, undefined, undefined, { nodes: [oauthWebhook] });
	await setActiveVersion(published.id, published.versionId);
	await createWorkflow({ nodes: [manualTrigger] });

	await command.run(['--json']);

	expect(JSON.parse(stdout)).toMatchObject({
		total: 2,
		eligible: 1,
		published: { total: 1, eligible: 0 },
		reasons: { TRIGGER_EXTERNAL_IDENTITY: 1 },
	});
});

test('reads every workflow when there are more than fit on one page', async () => {
	await createManyWorkflows(101, { nodes: [manualTrigger] });

	await command.run(['--json']);

	expect(JSON.parse(stdout)).toMatchObject({ total: 101, eligible: 101 });
});

test('prints the eligible share and the reason codes as a table by default', async () => {
	await createWorkflow({ nodes: [manualTrigger] });
	await createWorkflow({ nodes: [manualTrigger], settings: { credentialResolverId: 'resolver' } });

	await command.run();

	expect(stdout).toContain('Eligible for engine v2: 1 of 2 workflows (50%)');
	expect(stdout).toMatch(/END_USER_CREDENTIALS\s+1/);
});

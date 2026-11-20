import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { createWorkflowScanContext } from '../../../types';
import { SlackCredentialSignatureSecretRule } from '../slack-credential-signature-secret.rule';

const SLACK_TRIGGER = 'n8n-nodes-base.slackTrigger';
const SLACK = 'n8n-nodes-base.slack';

async function slackCredential(id: string, data: ICredentialDataDecryptedObject) {
	const credentials = new Credentials({ id, name: `Slack ${id}` }, 'slackApi');
	await credentials.setData(data);
	return mock<CredentialsEntity>({
		id,
		name: `Slack ${id}`,
		type: 'slackApi',
		data: credentials.getDataToSave().data,
	});
}

const withSlackCredential = (node: INode, id: string): INode => ({
	...node,
	credentials: { slackApi: { id, name: `Slack ${id}` } },
});

describe('SlackCredentialSignatureSecretRule', () => {
	const credentialsRepository = mock<CredentialsRepository>();
	const rule = new SlackCredentialSignatureSecretRule(credentialsRepository);

	let withSecret: CredentialsEntity;
	let noSecretKey: CredentialsEntity;

	beforeAll(async () => {
		withSecret = await slackCredential('cred-ok', {
			accessToken: 'xoxb-token',
			signatureSecret: 'secret',
		});
		noSecretKey = await slackCredential('cred-missing', { accessToken: 'xoxb-token' });
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMetadata()', () => {
		it('should describe a v3 workflow rule with no runtime impact', () => {
			const metadata = rule.getMetadata();

			expect(rule.id).toBe('slack-credential-signature-secret-v3');
			expect(metadata.version).toBe('v3');
			expect(metadata.category).toBe('workflow');
			expect(metadata.impact).toBe('capabilityRemoved');
		});
	});

	describe('detectWorkflow()', () => {
		it('should not read credentials when no node uses a Slack API credential', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Slack without credential', SLACK),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
			expect(credentialsRepository.getManyByIds).not.toHaveBeenCalled();
		});

		it('should not be affected when the credential has a signature secret', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([withSecret]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Send', SLACK), withSecret.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
		});

		it('should report a warning for a Slack node whose credential has no signature secret', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				level: 'warning',
				nodeId: 'node-Send',
				nodeName: 'Send',
			});
		});

		it('should leave Slack Trigger nodes to the trigger rule', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), noSecretKey.id),
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['Send']);
		});

		it('should not read credentials when the only Slack node is a Slack Trigger', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
			expect(credentialsRepository.getManyByIds).not.toHaveBeenCalled();
		});

		it('should read each credential once and report every node that uses it', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey, withSecret]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
				withSlackCredential(createNode('Send again', SLACK), noSecretKey.id),
				withSlackCredential(createNode('Fine', SLACK), withSecret.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(credentialsRepository.getManyByIds).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.getManyByIds.mock.calls[0][0]).toHaveLength(2);
			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['Send', 'Send again']);
		});

		it('should not be affected when the referenced credential does not exist', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Send', SLACK), 'gone'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
		});

		it('should read each credential once for all workflows that share a scan context', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const context = createWorkflowScanContext();
			const first = createWorkflow('wf-1', 'First', [
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
				withSlackCredential(createNode('Gone', SLACK), 'gone'),
			]);
			const second = createWorkflow('wf-2', 'Second', [
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
				withSlackCredential(createNode('Gone', SLACK), 'gone'),
			]);

			await rule.detectWorkflow(first.workflow, first.nodesGroupedByType, context);
			const result = await rule.detectWorkflow(second.workflow, second.nodesGroupedByType, context);

			expect(credentialsRepository.getManyByIds).toHaveBeenCalledTimes(1);
			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['Send']);
		});

		it('should read the credential again when the scan context is new', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
			]);

			await rule.detectWorkflow(workflow, nodesGroupedByType, createWorkflowScanContext());
			await rule.detectWorkflow(workflow, nodesGroupedByType, createWorkflowScanContext());

			expect(credentialsRepository.getManyByIds).toHaveBeenCalledTimes(2);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend adding the signature secret to the credential', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toMatch(/signature secret/i);
		});
	});
});

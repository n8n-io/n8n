import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { createWorkflowScanContext } from '../../../types';
import { SlackTriggerSignatureSecretRule } from '../slack-trigger-signature-secret.rule';

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

describe('SlackTriggerSignatureSecretRule', () => {
	const credentialsRepository = mock<CredentialsRepository>();
	const rule = new SlackTriggerSignatureSecretRule(credentialsRepository);

	let withSecret: CredentialsEntity;
	let emptySecret: CredentialsEntity;
	let noSecretKey: CredentialsEntity;

	beforeAll(async () => {
		withSecret = await slackCredential('cred-ok', {
			accessToken: 'xoxb-token',
			signatureSecret: 'secret',
		});
		emptySecret = await slackCredential('cred-empty', {
			accessToken: 'xoxb-token',
			signatureSecret: '',
		});
		noSecretKey = await slackCredential('cred-missing', { accessToken: 'xoxb-token' });
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMetadata()', () => {
		it('should describe a v3 workflow rule whose impact is failing executions', () => {
			const metadata = rule.getMetadata();

			expect(rule.id).toBe('slack-trigger-signature-secret-v3');
			expect(metadata.version).toBe('v3');
			expect(metadata.category).toBe('workflow');
			expect(metadata.impact).toBe('executionsFail');
		});
	});

	describe('detectWorkflow()', () => {
		it('should not read credentials when there is no Slack Trigger node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				withSlackCredential(createNode('Send', SLACK), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
			expect(credentialsRepository.getManyByIds).not.toHaveBeenCalled();
		});

		it('should not be affected when the Slack Trigger credential has a signature secret', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([withSecret]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), withSecret.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
		});

		it('should report an error for a Slack Trigger whose credential has an empty signature secret', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([emptySecret]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), emptySecret.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				level: 'error',
				nodeId: 'node-Trigger',
				nodeName: 'Trigger',
			});
			expect(result.issues[0].title).toContain('Trigger');
		});

		it('should report an error for a Slack Trigger whose credential has no signature secret field', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('error');
		});

		it('should only look up and report Slack Trigger nodes', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([emptySecret]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), emptySecret.id),
				withSlackCredential(createNode('Send', SLACK), emptySecret.id),
				withSlackCredential(createNode('Other', SLACK), noSecretKey.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(credentialsRepository.getManyByIds).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.getManyByIds).toHaveBeenCalledWith([emptySecret.id]);
			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['Trigger']);
		});

		it('should not be affected when the referenced credential does not exist', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), 'gone'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
		});

		it('should not read credentials when the credential reference has no id', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('Trigger', SLACK_TRIGGER),
					credentials: { slackApi: { id: null, name: 'Slack by name' } },
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
			expect(credentialsRepository.getManyByIds).not.toHaveBeenCalled();
		});

		it('should ignore a referenced credential of another type', async () => {
			const otherType = await slackCredential('cred-other', { apiKey: 'key' });
			otherType.type = 'httpHeaderAuth';
			credentialsRepository.getManyByIds.mockResolvedValue([otherType]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), otherType.id),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({ isAffected: false, issues: [] });
		});

		it('should propagate a credential decryption error', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([
				mock<CredentialsEntity>({
					id: 'bad',
					name: 'Slack bad',
					type: 'slackApi',
					data: 'not-ciphertext',
				}),
			]);
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), 'bad'),
			]);

			await expect(rule.detectWorkflow(workflow, nodesGroupedByType)).rejects.toThrow();
		});

		it('should read each credential once for all workflows that share a scan context', async () => {
			credentialsRepository.getManyByIds.mockResolvedValue([noSecretKey]);
			const context = createWorkflowScanContext();
			const first = createWorkflow('wf-1', 'First', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), noSecretKey.id),
			]);
			const second = createWorkflow('wf-2', 'Second', [
				withSlackCredential(createNode('Trigger', SLACK_TRIGGER), noSecretKey.id),
			]);

			await rule.detectWorkflow(first.workflow, first.nodesGroupedByType, context);
			const result = await rule.detectWorkflow(second.workflow, second.nodesGroupedByType, context);

			expect(credentialsRepository.getManyByIds).toHaveBeenCalledTimes(1);
			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['Trigger']);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend adding the signature secret and re-activating the workflow', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toMatch(/signature secret/i);
			expect(recommendations[0].description).toMatch(/activate/i);
		});
	});
});

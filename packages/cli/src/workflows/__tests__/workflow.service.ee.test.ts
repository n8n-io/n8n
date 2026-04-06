import type { CredentialsEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';

import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

describe('EnterpriseWorkflowService', () => {
	let service: EnterpriseWorkflowService;

	beforeEach(() => {
		service = new EnterpriseWorkflowService(
			mock(), // logger
			mock(), // sharedWorkflowRepository
			mock(), // workflowRepository
			mock(), // credentialsRepository
			mock(), // credentialsService
			mock(), // ownershipService
			mock(), // projectService
			mock(), // activeWorkflowManager
			mock(), // credentialsFinderService
			mock(), // enterpriseCredentialsService
			mock(), // workflowFinderService
			mock(), // folderService
			mock(), // folderRepository
			mock(), // workflowPublishHistoryRepository
		);
	});

	describe('validateCredentialPermissionsToUser()', () => {
		it('should pass when all credentials are in the allowed list', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [{ credentials: { googlePalmApi: { id: 'cred-1', name: 'Google' } } }],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).not.toThrow();
		});

		it('should throw when a credential id is not in the allowed list', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [{ credentials: { googlePalmApi: { id: 'cred-unknown', name: 'Google' } } }],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should skip __aiGatewayManaged credentials with null id', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).not.toThrow();
		});

		it('should still validate __aiGatewayManaged credentials that have a real id', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: 'cred-unknown', name: '', __aiGatewayManaged: true },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).toThrow();
		});

		it('should validate non-gateway credentials even when a gateway credential is also present', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
							openAiApi: { id: 'cred-unknown', name: 'OpenAI' },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).toThrow();
		});

		it('should skip nodes with no credentials', () => {
			const workflow = mock<IWorkflowBase>({ nodes: [{ credentials: undefined }] });

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).not.toThrow();
		});
	});
});

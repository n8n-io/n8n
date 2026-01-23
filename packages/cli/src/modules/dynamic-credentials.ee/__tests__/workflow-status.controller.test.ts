import { mock } from 'jest-mock-extended';
import type { Request, Response } from 'express';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { DynamicCredentialCorsService } from '../services/dynamic-credential-cors.service';
import { WorkflowStatusController } from '../workflow-status.controller';
import type { CredentialResolverWorkflowService } from '../services/credential-resolver-workflow.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import type { UrlService } from '@/services/url.service';
import type { GlobalConfig } from '@n8n/config';

jest.mock('../utils', () => ({
	getBearerToken: jest.requireActual('../utils').getBearerToken,
	getDynamicCredentialMiddlewares: jest.fn(() => undefined),
}));

describe('WorkflowStatusController', () => {
	let controller: WorkflowStatusController;
	let mockService: jest.Mocked<CredentialResolverWorkflowService>;
	let mockUrlService: jest.Mocked<UrlService>;
	let mockGlobalConfig: jest.Mocked<GlobalConfig>;
	let mockDynamicCredentialCorsService: jest.Mocked<DynamicCredentialCorsService>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockService = {
			getWorkflowStatus: jest.fn(),
		} as unknown as jest.Mocked<CredentialResolverWorkflowService>;

		mockUrlService = {
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://n8n.example.com'),
		} as unknown as jest.Mocked<UrlService>;

		mockGlobalConfig = {
			endpoints: {
				rest: 'rest',
			},
		} as unknown as jest.Mocked<GlobalConfig>;

		mockDynamicCredentialCorsService = {
			applyCorsHeadersIfEnabled: jest.fn(),
			preflightHandler: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialCorsService>;

		controller = new WorkflowStatusController(
			mockService,
			mockUrlService,
			mockGlobalConfig,
			mockDynamicCredentialCorsService,
		);
	});

	describe('checkWorkflowForExecution', () => {
		it('should throw UnauthenticatedError when authorization header is missing', async () => {
			const req = mock<Request>();
			req.params = { workflowId: 'workflow-1' };
			req.headers = {};
			const res = mock<Response>();

			await expect(controller.checkWorkflowForExecution(req, res)).rejects.toThrow(
				UnauthenticatedError,
			);
			expect(mockService.getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when authorization header is malformed (no Bearer)', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'token-123' },
			});
			const res = mock<Response>();

			await expect(controller.checkWorkflowForExecution(req, res)).rejects.toThrow(BadRequestError);
			await expect(controller.checkWorkflowForExecution(req, res)).rejects.toThrow(
				'Authorization header is malformed',
			);
			expect(mockService.getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when workflow ID is missing', async () => {
			const req = mock<Request>();
			req.params = { workflowId: '' };
			req.headers = { authorization: 'Bearer token-123' };
			const res = mock<Response>();

			await expect(controller.checkWorkflowForExecution(req, res)).rejects.toThrow(BadRequestError);
			await expect(controller.checkWorkflowForExecution(req, res)).rejects.toThrow(
				'Workflow ID is missing',
			);
			expect(mockService.getWorkflowStatus).not.toHaveBeenCalled();
		});

		it('should extract token correctly from Bearer authorization header', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer my-secret-token' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([]);

			await controller.checkWorkflowForExecution(req, res);

			expect(mockService.getWorkflowStatus).toHaveBeenCalledWith('workflow-1', 'my-secret-token');
		});

		it('should accept case-insensitive Bearer prefix', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'bearer my-secret-token' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([]);

			await controller.checkWorkflowForExecution(req, res);

			expect(mockService.getWorkflowStatus).toHaveBeenCalledWith('workflow-1', 'my-secret-token');
		});

		it('should return readyToExecute true when all credentials are configured', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'oauth2Api',
				},
				{
					credentialId: 'cred-2',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'httpBasicAuth',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result.readyToExecute).toBe(true);
			expect(result.workflowId).toBe('workflow-1');
			expect(result.credentials).toHaveLength(2);
		});

		it('should return readyToExecute false when any credential is missing', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'oauth2Api',
				},
				{
					credentialId: 'cred-2',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'missing',
					credentialType: 'httpBasicAuth',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result.readyToExecute).toBe(false);
			expect(result.workflowId).toBe('workflow-1');
			expect(result.credentials).toHaveLength(2);
		});

		it('should include authorizationUrl with encoded resolverId in response', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'oauth2Api',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result.credentials?.[0].authorizationUrl).toBe(
				'https://n8n.example.com/rest/credentials/cred-1/authorize?resolverId=resolver-1',
			);
			expect(result.credentials?.[0].revokeUrl).toBe(
				'https://n8n.example.com/rest/credentials/cred-1/revoke?resolverId=resolver-1',
			);
		});

		it('should properly encode special characters in resolverId', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver/with/special chars',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'oauth2Api',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result.credentials?.[0].authorizationUrl).toBe(
				'https://n8n.example.com/rest/credentials/cred-1/authorize?resolverId=resolver%2Fwith%2Fspecial%20chars',
			);
			expect(result.credentials?.[0].revokeUrl).toBe(
				'https://n8n.example.com/rest/credentials/cred-1/revoke?resolverId=resolver%2Fwith%2Fspecial%20chars',
			);
		});

		it('should return absolute URLs with base path from UrlService', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'configured',
					credentialType: 'oauth2Api',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			// Verify that the URL is absolute and starts with the base URL
			expect(result.credentials?.[0].authorizationUrl).toMatch(/^https:\/\//);
			expect(result.credentials?.[0].authorizationUrl).toContain('https://n8n.example.com');
			expect(result.credentials?.[0].revokeUrl).toMatch(/^https:\/\//);
			expect(result.credentials?.[0].revokeUrl).toContain('https://n8n.example.com');
			expect(mockUrlService.getInstanceBaseUrl).toHaveBeenCalled();
		});

		it('should map service response to DTO correctly', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					resolverId: 'resolver-1',
					credentialName: 'My OAuth2 Credential',
					status: 'missing',
					credentialType: 'oauth2Api',
				},
			]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result).toEqual({
				workflowId: 'workflow-1',
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'cred-1',
						credentialStatus: 'missing',
						credentialName: 'My OAuth2 Credential',
						credentialType: 'oauth2Api',
						authorizationUrl:
							'https://n8n.example.com/rest/credentials/cred-1/authorize?resolverId=resolver-1',
						revokeUrl:
							'https://n8n.example.com/rest/credentials/cred-1/revoke?resolverId=resolver-1',
					},
				],
			});
		});

		it('should return readyToExecute true for empty credentials array', async () => {
			const req = mock<Request>({
				params: { workflowId: 'workflow-1' },
				headers: { authorization: 'Bearer token-123' },
			});
			const res = mock<Response>();

			mockService.getWorkflowStatus.mockResolvedValue([]);

			const result = await controller.checkWorkflowForExecution(req, res);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toEqual([]);
		});
	});
});

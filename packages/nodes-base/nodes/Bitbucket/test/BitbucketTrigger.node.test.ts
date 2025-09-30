import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IDataObject,
} from 'n8n-workflow';

import { BitbucketTrigger } from '../BitbucketTrigger.node';
import * as GenericFunctions from '../GenericFunctions';

// Mock the GenericFunctions
jest.mock('../GenericFunctions');

describe('BitbucketTrigger Node', () => {
	let bitbucketTrigger: BitbucketTrigger;

	beforeEach(() => {
		bitbucketTrigger = new BitbucketTrigger();
		jest.clearAllMocks();
	});

	describe('Credential Test', () => {
		let mockThis: ICredentialTestFunctions;

		beforeEach(() => {
			mockThis = {
				helpers: {
					request: jest.fn(),
				},
			} as any;
		});

		it('should return success when credentials are valid', async () => {
			const validCredential: ICredentialsDecrypted = {
				id: 'test-id',
				name: 'test-cred',
				type: 'bitbucketApi',
				data: {
					email: 'test@example.com',
					apiToken: 'valid-token',
				},
			};

			(mockThis.helpers.request as jest.Mock).mockResolvedValue({
				username: 'testuser',
			});

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockThis,
				validCredential,
			);

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful!',
			});
		});

		it('should return error when credentials are invalid', async () => {
			const invalidCredential: ICredentialsDecrypted = {
				id: 'test-id',
				name: 'test-cred',
				type: 'bitbucketApi',
				data: {
					email: 'test@example.com',
					apiToken: 'invalid-token',
				},
			};

			(mockThis.helpers.request as jest.Mock).mockResolvedValue({
				error: 'Invalid token',
			});

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockThis,
				invalidCredential,
			);

			expect(result).toEqual({
				status: 'Error',
				message: 'Token is not valid: Invalid token',
			});
		});

		it('should handle request errors', async () => {
			const credential: ICredentialsDecrypted = {
				id: 'test-id',
				name: 'test-cred',
				type: 'bitbucketApi',
				data: {
					email: 'test@example.com',
					apiToken: 'token',
				},
			};

			(mockThis.helpers.request as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockThis,
				credential,
			);

			expect(result.status).toBe('Error');
			expect(result.message).toContain('Settings are not valid');
		});
	});

	describe('Load Options Methods', () => {
		let mockThis: ILoadOptionsFunctions;

		beforeEach(() => {
			mockThis = {
				getCurrentNodeParameter: jest.fn(),
			} as any;
		});

		describe('getWorkspaces', () => {
			it('should return formatted workspace options', async () => {
				const mockWorkspaces = [
					{ name: 'Test Workspace 1', slug: 'test-workspace-1' },
					{ name: 'Test Workspace 2', slug: 'test-workspace-2' },
				];

				(GenericFunctions.bitbucketApiRequestAllItems as jest.Mock).mockResolvedValue(
					mockWorkspaces,
				);

				const result = await bitbucketTrigger.methods.loadOptions.getWorkspaces.call(mockThis);

				expect(result).toEqual([
					{ name: 'Test Workspace 1', value: 'test-workspace-1' },
					{ name: 'Test Workspace 2', value: 'test-workspace-2' },
				]);

				expect(GenericFunctions.bitbucketApiRequestAllItems).toHaveBeenCalledWith(
					'values',
					'GET',
					'/workspaces',
				);
			});
		});

		describe('getRepositories', () => {
			it('should return formatted repository options', async () => {
				const mockRepositories = [
					{ slug: 'repo-1', description: 'Repository 1' },
					{ slug: 'repo-2', description: 'Repository 2' },
				];

				(mockThis.getCurrentNodeParameter as jest.Mock).mockReturnValue('test-workspace');
				(GenericFunctions.bitbucketApiRequestAllItems as jest.Mock).mockResolvedValue(
					mockRepositories,
				);

				const result = await bitbucketTrigger.methods.loadOptions.getRepositories.call(mockThis);

				expect(result).toEqual([
					{ name: 'repo-1', value: 'repo-1', description: 'Repository 1' },
					{ name: 'repo-2', value: 'repo-2', description: 'Repository 2' },
				]);

				expect(GenericFunctions.bitbucketApiRequestAllItems).toHaveBeenCalledWith(
					'values',
					'GET',
					'/repositories/test-workspace',
				);
			});
		});

		describe('getWorkspaceEvents', () => {
			it('should return formatted workspace event options', async () => {
				const mockEvents = [
					{ event: 'repo:created', description: 'Repository created' },
					{ event: 'repo:deleted', description: 'Repository deleted' },
				];

				(GenericFunctions.bitbucketApiRequestAllItems as jest.Mock).mockResolvedValue(mockEvents);

				const result = await bitbucketTrigger.methods.loadOptions.getWorkspaceEvents.call(mockThis);

				expect(result).toEqual([
					{ name: 'repo:created', value: 'repo:created', description: 'Repository created' },
					{ name: 'repo:deleted', value: 'repo:deleted', description: 'Repository deleted' },
				]);

				expect(GenericFunctions.bitbucketApiRequestAllItems).toHaveBeenCalledWith(
					'values',
					'GET',
					'/hook_events/workspace',
				);
			});
		});

		describe('getRepositoriesEvents', () => {
			it('should return formatted repository event options', async () => {
				const mockEvents = [
					{ event: 'repo:push', description: 'Repository push' },
					{ event: 'pullrequest:created', description: 'Pull request created' },
				];

				(GenericFunctions.bitbucketApiRequestAllItems as jest.Mock).mockResolvedValue(mockEvents);

				const result =
					await bitbucketTrigger.methods.loadOptions.getRepositoriesEvents.call(mockThis);

				expect(result).toEqual([
					{ name: 'repo:push', value: 'repo:push', description: 'Repository push' },
					{
						name: 'pullrequest:created',
						value: 'pullrequest:created',
						description: 'Pull request created',
					},
				]);

				expect(GenericFunctions.bitbucketApiRequestAllItems).toHaveBeenCalledWith(
					'values',
					'GET',
					'/hook_events/repository',
				);
			});
		});
	});

	describe('Webhook Methods', () => {
		describe('checkExists', () => {
			let mockThis: IHookFunctions;
			let webhookData: IDataObject;

			beforeEach(() => {
				webhookData = {};
				mockThis = {
					getNodeParameter: jest.fn(),
					getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook'),
					getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
				} as any;
			});

			it('should return true when webhook exists for workspace resource', async () => {
				const mockHooks = [
					{
						uuid: '{12345}',
						url: 'https://example.com/webhook',
						active: true,
					},
				];

				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('workspace')
					.mockReturnValueOnce('test-workspace');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue({
					values: mockHooks,
				});

				const result = await bitbucketTrigger.webhookMethods.default.checkExists.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBe('12345');
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'GET',
					'/workspaces/test-workspace/hooks',
				);
			});

			it('should return true when webhook exists for repository resource', async () => {
				const mockHooks = [
					{
						uuid: '{67890}',
						url: 'https://example.com/webhook',
						active: true,
					},
				];

				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('repository')
					.mockReturnValueOnce('test-workspace')
					.mockReturnValueOnce('test-repo');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue({
					values: mockHooks,
				});

				const result = await bitbucketTrigger.webhookMethods.default.checkExists.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBe('67890');
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'GET',
					'/repositories/test-workspace/test-repo/hooks',
				);
			});

			it('should return false when webhook does not exist', async () => {
				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('workspace')
					.mockReturnValueOnce('test-workspace');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue({
					values: [],
				});

				const result = await bitbucketTrigger.webhookMethods.default.checkExists.call(mockThis);

				expect(result).toBe(false);
			});
		});

		describe('create', () => {
			let mockThis: IHookFunctions;
			let webhookData: IDataObject;

			beforeEach(() => {
				webhookData = {};
				mockThis = {
					getNodeParameter: jest.fn(),
					getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook'),
					getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
				} as any;
			});

			it('should create workspace webhook and return true', async () => {
				const mockResponse = {
					uuid: '{new-webhook-id}',
				};

				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(['repo:created'])
					.mockReturnValueOnce('workspace')
					.mockReturnValueOnce('test-workspace');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				const result = await bitbucketTrigger.webhookMethods.default.create.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBe('new-webhook-id');
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'POST',
					'/workspaces/test-workspace/hooks',
					{
						description: 'n8n webhook',
						url: 'https://example.com/webhook',
						active: true,
						events: ['repo:created'],
					},
				);
			});

			it('should create repository webhook and return true', async () => {
				const mockResponse = {
					uuid: '{repo-webhook-id}',
				};

				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(['repo:push'])
					.mockReturnValueOnce('repository')
					.mockReturnValueOnce('test-workspace')
					.mockReturnValueOnce('test-repo');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				const result = await bitbucketTrigger.webhookMethods.default.create.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBe('repo-webhook-id');
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'POST',
					'/repositories/test-workspace/test-repo/hooks',
					{
						description: 'n8n webhook',
						url: 'https://example.com/webhook',
						active: true,
						events: ['repo:push'],
					},
				);
			});
		});

		describe('delete', () => {
			let mockThis: IHookFunctions;
			let webhookData: IDataObject;

			beforeEach(() => {
				webhookData = {
					webhookId: 'existing-webhook-id',
				};
				mockThis = {
					getNodeParameter: jest.fn(),
					getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
				} as any;
			});

			it('should delete workspace webhook and return true', async () => {
				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('test-workspace')
					.mockReturnValueOnce('workspace');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue({});

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBeUndefined();
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/workspaces/test-workspace/hooks/existing-webhook-id',
				);
			});

			it('should delete repository webhook and return true', async () => {
				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('test-workspace')
					.mockReturnValueOnce('repository')
					.mockReturnValueOnce('test-repo');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockResolvedValue({});

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockThis);

				expect(result).toBe(true);
				expect(webhookData.webhookId).toBeUndefined();
				expect(GenericFunctions.bitbucketApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/repositories/test-workspace/test-repo/hooks/existing-webhook-id',
				);
			});

			it('should return false when deletion fails', async () => {
				(mockThis.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('test-workspace')
					.mockReturnValueOnce('workspace');

				(GenericFunctions.bitbucketApiRequest as jest.Mock).mockRejectedValue(
					new Error('Deletion failed'),
				);

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockThis);

				expect(result).toBe(false);
				// webhookId should still exist since deletion failed
				expect(webhookData.webhookId).toBe('existing-webhook-id');
			});
		});
	});

	describe('Webhook Function', () => {
		let mockThis: IWebhookFunctions;
		let webhookData: IDataObject;

		beforeEach(() => {
			webhookData = {
				webhookId: 'test-webhook-id',
			};
			mockThis = {
				getRequestObject: jest.fn(),
				getHeaderData: jest.fn(),
				getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => data),
				},
			} as any;
		});

		it('should process webhook data when webhook ID matches', async () => {
			const mockRequestBody = {
				repository: {
					name: 'test-repo',
				},
				actor: {
					username: 'testuser',
				},
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				body: mockRequestBody,
			});

			(mockThis.getHeaderData as jest.Mock).mockReturnValue({
				'x-hook-uuid': 'test-webhook-id',
			});

			const result = await bitbucketTrigger.webhook.call(mockThis);

			expect(result).toEqual({
				workflowData: [mockRequestBody],
			});
		});

		it('should return empty object when webhook ID does not match', async () => {
			(mockThis.getHeaderData as jest.Mock).mockReturnValue({
				'x-hook-uuid': 'different-webhook-id',
			});

			const result = await bitbucketTrigger.webhook.call(mockThis);

			expect(result).toEqual({});
		});

		it('should return empty object when webhook ID header is missing', async () => {
			(mockThis.getHeaderData as jest.Mock).mockReturnValue({});

			const result = await bitbucketTrigger.webhook.call(mockThis);

			expect(result).toEqual({});
		});
	});
});

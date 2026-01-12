import { mockDeep } from 'jest-mock-extended';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IWebhookFunctions,
} from 'n8n-workflow';

import { BitbucketTrigger } from '../BitbucketTrigger.node';
import * as GenericFunctions from '../GenericFunctions';

describe('BitbucketTrigger', () => {
	let bitbucketTrigger: BitbucketTrigger;
	const bitbucketApiRequestSpy = jest.spyOn(GenericFunctions, 'bitbucketApiRequest');
	const bitbucketApiRequestAllItemsSpy = jest.spyOn(
		GenericFunctions,
		'bitbucketApiRequestAllItems',
	);

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Bitbucket Trigger Test',
		type: 'n8n-nodes-base.bitbucketTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		jest.resetAllMocks();
		bitbucketTrigger = new BitbucketTrigger();
	});

	describe('credential test', () => {
		const mockCredentialTestFunctions = mockDeep<ICredentialTestFunctions>();

		beforeEach(() => {
			mockCredentialTestFunctions.helpers.request.mockClear();
		});

		it('should return success for valid credentials', async () => {
			const mockCredentials: ICredentialsDecrypted = {
				id: 'test-cred-id',
				name: 'Test Bitbucket Credentials',
				type: 'bitbucketApi',
				data: {
					username: 'testuser',
					appPassword: 'testpassword',
				},
			};

			const mockResponse = {
				username: 'testuser',
				display_name: 'Test User',
			};

			mockCredentialTestFunctions.helpers.request.mockResolvedValue(mockResponse);

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockCredentialTestFunctions,
				mockCredentials,
			);

			expect(mockCredentialTestFunctions.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				auth: {
					user: 'testuser',
					password: 'testpassword',
				},
				uri: 'https://api.bitbucket.org/2.0/user',
				json: true,
				timeout: 5000,
			});

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful!',
			});
		});

		it('should return error for invalid credentials', async () => {
			const mockCredentials: ICredentialsDecrypted = {
				id: 'test-cred-id',
				name: 'Test Bitbucket Credentials',
				type: 'bitbucketApi',
				data: {
					username: 'testuser',
					appPassword: 'wrongpassword',
				},
			};

			const mockResponse = {
				error: 'Invalid credentials',
			};

			mockCredentialTestFunctions.helpers.request.mockResolvedValue(mockResponse);

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockCredentialTestFunctions,
				mockCredentials,
			);

			expect(result).toEqual({
				status: 'Error',
				message: 'Token is not valid: Invalid credentials',
			});
		});

		it('should return error when request fails', async () => {
			const mockCredentials: ICredentialsDecrypted = {
				id: 'test-cred-id',
				name: 'Test Bitbucket Credentials',
				type: 'bitbucketApi',
				data: {
					username: 'testuser',
					appPassword: 'testpassword',
				},
			};

			const mockError = new Error('Network error');
			mockCredentialTestFunctions.helpers.request.mockRejectedValue(mockError);

			const result = await bitbucketTrigger.methods.credentialTest.bitbucketApiTest.call(
				mockCredentialTestFunctions,
				mockCredentials,
			);

			expect(result).toEqual({
				status: 'Error',
				message: 'Settings are not valid: Error: Network error',
			});
		});
	});

	describe('load options methods', () => {
		const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();

		beforeEach(() => {
			mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);
		});

		describe('getWorkspaceEvents', () => {
			it('should return workspace events', async () => {
				const mockEvents = [
					{
						event: 'repo:push',
						description: 'Repository push',
					},
					{
						event: 'repo:fork',
						description: 'Repository fork',
					},
				];

				bitbucketApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

				const result =
					await bitbucketTrigger.methods.loadOptions.getWorkspaceEvents.call(
						mockLoadOptionsFunctions,
					);

				expect(bitbucketApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'values',
					'GET',
					'/hook_events/workspace',
				);

				expect(result).toEqual([
					{
						name: 'repo:push',
						value: 'repo:push',
						description: 'Repository push',
					},
					{
						name: 'repo:fork',
						value: 'repo:fork',
						description: 'Repository fork',
					},
				]);
			});

			it('should handle empty events list', async () => {
				bitbucketApiRequestAllItemsSpy.mockResolvedValue([]);

				const result =
					await bitbucketTrigger.methods.loadOptions.getWorkspaceEvents.call(
						mockLoadOptionsFunctions,
					);

				expect(result).toEqual([]);
			});
		});

		describe('getRepositoriesEvents', () => {
			it('should return repository events', async () => {
				const mockEvents = [
					{
						event: 'repo:push',
						description: 'Repository push',
					},
					{
						event: 'pullrequest:created',
						description: 'Pull request created',
					},
				];

				bitbucketApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

				const result =
					await bitbucketTrigger.methods.loadOptions.getRepositoriesEvents.call(
						mockLoadOptionsFunctions,
					);

				expect(bitbucketApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'values',
					'GET',
					'/hook_events/repository',
				);

				expect(result).toEqual([
					{
						name: 'repo:push',
						value: 'repo:push',
						description: 'Repository push',
					},
					{
						name: 'pullrequest:created',
						value: 'pullrequest:created',
						description: 'Pull request created',
					},
				]);
			});
		});

		describe('getRepositories', () => {
			it('should return repositories for workspace', async () => {
				const mockRepositories = [
					{
						slug: 'repo1',
						description: 'First repository',
					},
					{
						slug: 'repo2',
						description: 'Second repository',
					},
				];

				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('test-workspace');
				bitbucketApiRequestAllItemsSpy.mockResolvedValue(mockRepositories);

				const result =
					await bitbucketTrigger.methods.loadOptions.getRepositories.call(mockLoadOptionsFunctions);

				expect(mockLoadOptionsFunctions.getCurrentNodeParameter).toHaveBeenCalledWith('workspace');
				expect(bitbucketApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'values',
					'GET',
					'/repositories/test-workspace',
				);

				expect(result).toEqual([
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'repo1',
						value: 'repo1',
						description: 'First repository',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'repo2',
						value: 'repo2',
						description: 'Second repository',
					},
				]);
			});
		});

		describe('getWorkspaces', () => {
			it('should return workspaces', async () => {
				const mockWorkspaces = [
					{
						name: 'Workspace 1',
						slug: 'workspace1',
					},
					{
						name: 'Workspace 2',
						slug: 'workspace2',
					},
				];

				bitbucketApiRequestAllItemsSpy.mockResolvedValue(mockWorkspaces);

				const result =
					await bitbucketTrigger.methods.loadOptions.getWorkspaces.call(mockLoadOptionsFunctions);

				expect(bitbucketApiRequestAllItemsSpy).toHaveBeenCalledWith('values', 'GET', '/workspaces');

				expect(result).toEqual([
					{
						name: 'Workspace 1',
						value: 'workspace1',
					},
					{
						name: 'Workspace 2',
						value: 'workspace2',
					},
				]);
			});
		});
	});

	describe('webhook methods', () => {
		const mockHookFunctions = mockDeep<IHookFunctions>();

		beforeEach(() => {
			mockHookFunctions.getNode.mockReturnValue(mockNode);
			mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://test.n8n.io/webhook/test');
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
		});

		describe('checkExists', () => {
			it('should return true if webhook exists for workspace', async () => {
				const mockHooks = {
					values: [
						{
							uuid: '{12345678-1234-1234-1234-123456789012}',
							url: 'https://test.n8n.io/webhook/test',
							active: true,
						},
						{
							uuid: '{87654321-4321-4321-4321-210987654321}',
							url: 'https://other.webhook.url',
							active: true,
						},
					],
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockHooks);

				const result =
					await bitbucketTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/workspaces/test-workspace/hooks',
				);
				expect(result).toBe(true);

				// Check that webhook ID is stored
				const staticData = mockHookFunctions.getWorkflowStaticData('node');
				expect(staticData.webhookId).toBe('12345678-1234-1234-1234-123456789012');
			});

			it('should return true if webhook exists for repository', async () => {
				const mockHooks = {
					values: [
						{
							uuid: '{12345678-1234-1234-1234-123456789012}',
							url: 'https://test.n8n.io/webhook/test',
							active: true,
						},
					],
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'repository';
					if (paramName === 'workspace') return 'test-workspace';
					if (paramName === 'repository') return 'test-repo';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockHooks);

				const result =
					await bitbucketTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/repositories/test-workspace/test-repo/hooks',
				);
				expect(result).toBe(true);
			});

			it('should return false if webhook does not exist', async () => {
				const mockHooks = {
					values: [
						{
							uuid: '{87654321-4321-4321-4321-210987654321}',
							url: 'https://other.webhook.url',
							active: true,
						},
					],
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockHooks);

				const result =
					await bitbucketTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
			});

			it('should return false if webhook exists but is inactive', async () => {
				const mockHooks = {
					values: [
						{
							uuid: '{12345678-1234-1234-1234-123456789012}',
							url: 'https://test.n8n.io/webhook/test',
							active: false,
						},
					],
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockHooks);

				const result =
					await bitbucketTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
			});
		});

		describe('create', () => {
			it('should create webhook for workspace', async () => {
				const mockResponse = {
					uuid: '{12345678-1234-1234-1234-123456789012}',
					url: 'https://test.n8n.io/webhook/test',
					active: true,
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					if (paramName === 'events') return ['repo:push', 'repo:fork'];
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockResponse);

				const result = await bitbucketTrigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/workspaces/test-workspace/hooks',
					{
						description: 'n8n webhook',
						url: 'https://test.n8n.io/webhook/test',
						active: true,
						events: ['repo:push', 'repo:fork'],
					},
				);

				expect(result).toBe(true);

				// Check that webhook ID is stored
				const staticData = mockHookFunctions.getWorkflowStaticData('node');
				expect(staticData.webhookId).toBe('12345678-1234-1234-1234-123456789012');
			});

			it('should create webhook for repository', async () => {
				const mockResponse = {
					uuid: '{12345678-1234-1234-1234-123456789012}',
					url: 'https://test.n8n.io/webhook/test',
					active: true,
				};

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'repository';
					if (paramName === 'workspace') return 'test-workspace';
					if (paramName === 'repository') return 'test-repo';
					if (paramName === 'events') return ['pullrequest:created'];
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue(mockResponse);

				const result = await bitbucketTrigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/repositories/test-workspace/test-repo/hooks',
					{
						description: 'n8n webhook',
						url: 'https://test.n8n.io/webhook/test',
						active: true,
						events: ['pullrequest:created'],
					},
				);

				expect(result).toBe(true);
			});
		});

		describe('delete', () => {
			it('should delete webhook for workspace', async () => {
				const staticData = { webhookId: '12345678-1234-1234-1234-123456789012' };
				mockHookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue({});

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/workspaces/test-workspace/hooks/12345678-1234-1234-1234-123456789012',
				);

				expect(result).toBe(true);
				expect(staticData.webhookId).toBeUndefined();
			});

			it('should delete webhook for repository', async () => {
				const staticData = { webhookId: '12345678-1234-1234-1234-123456789012' };
				mockHookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'repository';
					if (paramName === 'workspace') return 'test-workspace';
					if (paramName === 'repository') return 'test-repo';
					return undefined;
				});

				bitbucketApiRequestSpy.mockResolvedValue({});

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(bitbucketApiRequestSpy).toHaveBeenCalledWith(
					'DELETE',
					'/repositories/test-workspace/test-repo/hooks/12345678-1234-1234-1234-123456789012',
				);

				expect(result).toBe(true);
				expect(staticData.webhookId).toBeUndefined();
			});

			it('should return false if delete fails', async () => {
				const staticData = { webhookId: '12345678-1234-1234-1234-123456789012' };
				mockHookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'resource') return 'workspace';
					if (paramName === 'workspace') return 'test-workspace';
					return undefined;
				});

				bitbucketApiRequestSpy.mockRejectedValue(new Error('Delete failed'));

				const result = await bitbucketTrigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(result).toBe(false);
				// Webhook ID should still be present since delete failed
				expect(staticData.webhookId).toBe('12345678-1234-1234-1234-123456789012');
			});
		});
	});

	describe('webhook', () => {
		const mockWebhookFunctions = mockDeep<IWebhookFunctions>();

		beforeEach(() => {
			mockWebhookFunctions.getNode.mockReturnValue(mockNode);
		});

		it('should process webhook with matching UUID', async () => {
			const webhookId = '12345678-1234-1234-1234-123456789012';
			const staticData = { webhookId };
			const mockRequestBody = {
				repository: {
					name: 'test-repo',
				},
				push: {
					changes: [
						{
							new: {
								name: 'main',
							},
						},
					],
				},
			};

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: mockRequestBody,
			} as any);
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-uuid': webhookId,
			});
			mockWebhookFunctions.helpers.returnJsonArray.mockReturnValue([{ json: mockRequestBody }]);

			const result = await bitbucketTrigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[{ json: mockRequestBody }]],
			});
		});

		it('should return empty object for non-matching UUID', async () => {
			const webhookId = '12345678-1234-1234-1234-123456789012';
			const staticData = { webhookId };

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-uuid': 'different-uuid',
			});

			const result = await bitbucketTrigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should handle array request body', async () => {
			const webhookId = '12345678-1234-1234-1234-123456789012';
			const staticData = { webhookId };
			const mockRequestBody = [
				{
					repository: { name: 'repo1' },
				},
				{
					repository: { name: 'repo2' },
				},
			];

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: mockRequestBody,
			} as any);
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-uuid': webhookId,
			});
			mockWebhookFunctions.helpers.returnJsonArray.mockReturnValue([
				{ json: mockRequestBody[0] },
				{ json: mockRequestBody[1] },
			]);

			const result = await bitbucketTrigger.webhook.call(mockWebhookFunctions);

			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(mockRequestBody);
			expect(result).toEqual({
				workflowData: [[{ json: mockRequestBody[0] }, { json: mockRequestBody[1] }]],
			});
		});
	});
});

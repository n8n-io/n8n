import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { EntityManager } from '@n8n/typeorm';
import type { INodeCredentials } from 'n8n-workflow';

import {
	ChatHubCredentialsService,
	type CredentialWithProjectId,
} from '../chat-hub-credentials.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { ChatHubLLMProvider } from '@n8n/api-types';

describe('ChatHubCredentialsService', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const service = new ChatHubCredentialsService(credentialsFinderService);

	const mockUser = mock<User>({ id: 'user-123' });
	const mockTrx = mock<EntityManager>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('ensureCredentials', () => {
		it('should return credential when user has access and credential is found', async () => {
			const mockCredential = mock<CredentialWithProjectId>({
				id: 'cred-123',
				name: 'OpenAI Credentials',
				type: 'openAiApi',
				projectId: 'project-456',
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: 'cred-123', name: 'OpenAI Credentials' },
			};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockCredential]);

			const result = await service.ensureCredentials(
				mockUser,
				'openai' as ChatHubLLMProvider,
				credentials,
				mockTrx,
			);

			expect(result).toEqual(mockCredential);
			expect(credentialsFinderService.findAllCredentialsForUser).toHaveBeenCalledWith(
				mockUser,
				['credential:read'],
				mockTrx,
				{ includeGlobalCredentials: true },
			);
		});

		it('should include global credentials when fetching credentials', async () => {
			const mockGlobalCredential = mock<CredentialWithProjectId>({
				id: 'global-cred-123',
				name: 'Global OpenAI Credentials',
				type: 'openAiApi',
				isGlobal: true,
				projectId: 'project-global',
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: 'global-cred-123', name: 'Global OpenAI Credentials' },
			};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockGlobalCredential]);

			const result = await service.ensureCredentials(
				mockUser,
				'openai' as ChatHubLLMProvider,
				credentials,
				mockTrx,
			);

			expect(result).toEqual(mockGlobalCredential);
			expect(credentialsFinderService.findAllCredentialsForUser).toHaveBeenCalledWith(
				mockUser,
				['credential:read'],
				mockTrx,
				{ includeGlobalCredentials: true },
			);
		});

		it('should throw BadRequestError when no credentials are provided', async () => {
			const credentials: INodeCredentials = {};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([]);

			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(BadRequestError);
			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow('No credentials provided for the selected model provider');
		});

		it('should throw ForbiddenError when user does not have access to the credential', async () => {
			const mockCredential = mock<CredentialWithProjectId>({
				id: 'other-cred-456',
				name: 'Other Credentials',
				type: 'openAiApi',
				projectId: 'project-other',
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: 'cred-123', name: 'OpenAI Credentials' },
			};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockCredential]);

			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(ForbiddenError);
			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow("You don't have access to the provided credentials");
		});

		it('should handle n8n provider by returning null credential ID', async () => {
			const credentials: INodeCredentials = {};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([]);

			await expect(
				service.ensureCredentials(mockUser, 'n8n' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(BadRequestError);
		});

		it('should handle custom-agent provider by returning null credential ID', async () => {
			const credentials: INodeCredentials = {};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([]);

			await expect(
				service.ensureCredentials(
					mockUser,
					'custom-agent' as ChatHubLLMProvider,
					credentials,
					mockTrx,
				),
			).rejects.toThrow(BadRequestError);
		});

		it('should return first credential when credential is shared through multiple projects', async () => {
			const mockCredential = mock<CredentialWithProjectId>({
				id: 'cred-123',
				name: 'Shared Credentials',
				type: 'openAiApi',
				projectId: 'project-1',
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: 'cred-123', name: 'Shared Credentials' },
			};

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockCredential]);

			const result = await service.ensureCredentials(
				mockUser,
				'openai' as ChatHubLLMProvider,
				credentials,
				mockTrx,
			);

			expect(result).toEqual(mockCredential);
			expect(result).toHaveProperty('projectId');
		});
	});

	describe('ensureCredentialById', () => {
		it('should return credential when user has access to the credential', async () => {
			const mockCredential = mock<CredentialWithProjectId>({
				id: 'cred-123',
				name: 'OpenAI Credentials',
				type: 'openAiApi',
				projectId: 'project-456',
			});

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockCredential]);

			const result = await service.ensureCredentialById(mockUser, 'cred-123', mockTrx);

			expect(result).toEqual(mockCredential);
			expect(credentialsFinderService.findAllCredentialsForUser).toHaveBeenCalledWith(
				mockUser,
				['credential:read'],
				mockTrx,
				{ includeGlobalCredentials: true },
			);
		});

		it('should include global credentials when fetching by ID', async () => {
			const mockGlobalCredential = mock<CredentialWithProjectId>({
				id: 'global-cred-123',
				name: 'Global OpenAI Credentials',
				type: 'openAiApi',
				isGlobal: true,
				projectId: 'project-global',
			});

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockGlobalCredential]);

			const result = await service.ensureCredentialById(mockUser, 'global-cred-123', mockTrx);

			expect(result).toEqual(mockGlobalCredential);
			expect(credentialsFinderService.findAllCredentialsForUser).toHaveBeenCalledWith(
				mockUser,
				['credential:read'],
				mockTrx,
				{ includeGlobalCredentials: true },
			);
		});

		it('should throw ForbiddenError when user does not have access to the credential', async () => {
			const mockCredential = mock<CredentialWithProjectId>({
				id: 'other-cred-456',
				name: 'Other Credentials',
				type: 'openAiApi',
				projectId: 'project-other',
			});

			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([mockCredential]);

			await expect(service.ensureCredentialById(mockUser, 'cred-123', mockTrx)).rejects.toThrow(
				ForbiddenError,
			);
			await expect(service.ensureCredentialById(mockUser, 'cred-123', mockTrx)).rejects.toThrow(
				"You don't have access to the provided credentials",
			);
		});

		it('should throw ForbiddenError when credential is not found', async () => {
			credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([]);

			await expect(service.ensureCredentialById(mockUser, 'cred-123', mockTrx)).rejects.toThrow(
				ForbiddenError,
			);
		});
	});
});

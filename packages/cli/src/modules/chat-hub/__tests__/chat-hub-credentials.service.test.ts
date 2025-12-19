import type { ChatHubLLMProvider } from '@n8n/api-types';
import type {
	CredentialsEntity,
	Project,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { INodeCredentials } from 'n8n-workflow';

import { ChatHubCredentialsService } from '../chat-hub-credentials.service';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

const CREDENTIAL_ID = 'credential-id-123';
const OTHER_CREDENTIAL_ID = 'other-credential-id-456';
const PERSONAL_PROJECT_ID = 'personal-project-id';
const OTHER_PROJECT_ID = 'other-project-id';
const GLOBAL_PROJECT_ID = 'global-project-id';

describe('ChatHubCredentialsService', () => {
	const credentialsService = mock<CredentialsService>();
	const projectRepository = mock<ProjectRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();

	const service = new ChatHubCredentialsService(
		credentialsService,
		projectRepository,
		sharedWorkflowRepository,
	);

	const mockUser = mock<User>({ id: 'user-123' });
	const mockTrx = mock<EntityManager>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('ensureCredentials', () => {
		it('should return credential when user has access and credential is found', async () => {
			const mockCredential = mock({
				id: CREDENTIAL_ID,
				projectId: PERSONAL_PROJECT_ID,
				name: 'OpenAI Credentials',
				type: 'openAiApi',
				scopes: ['credential:read'],
				isManaged: false,
				isGlobal: false,
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			projectRepository.getPersonalProjectForUser.mockResolvedValue({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
			} as Project);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([mockCredential]);

			const result = await service.ensureCredentials(
				mockUser,
				'openai' satisfies ChatHubLLMProvider,
				credentials,
				mockTrx,
			);

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith(
				mockUser.id,
				mockTrx,
			);
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(
				mockUser,
				{ projectId: PERSONAL_PROJECT_ID },
			);

			expect(result).toEqual({
				id: mockCredential.id,
				projectId: mockCredential.projectId,
			});
		});

		it('should include global credentials when fetching credentials', async () => {
			const mockGlobalCredential = mock({
				id: CREDENTIAL_ID,
				projectId: GLOBAL_PROJECT_ID,
				name: 'Global OpenAI Credentials',
				type: 'openAiApi',
				scopes: ['credential:read'],
				isManaged: false,
				isGlobal: true,
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'Global OpenAI Credentials' },
			};

			projectRepository.getPersonalProjectForUser.mockResolvedValue({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
			} as Project);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				mockGlobalCredential,
			]);

			const result = await service.ensureCredentials(
				mockUser,
				'openai' as ChatHubLLMProvider,
				credentials,
				mockTrx,
			);

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith(
				mockUser.id,
				mockTrx,
			);
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(
				mockUser,
				{ projectId: PERSONAL_PROJECT_ID },
			);

			expect(result).toEqual({
				id: mockGlobalCredential.id,
				projectId: PERSONAL_PROJECT_ID,
			});
		});

		it('should throw BadRequestError when no credentials are provided', async () => {
			const credentials: INodeCredentials = {};

			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(BadRequestError);
			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow('No credentials provided for the selected model provider');
		});

		it('should throw ForbiddenError when user does not have access to the credential', async () => {
			const mockCredential = mock({
				id: OTHER_CREDENTIAL_ID,
				projectId: OTHER_PROJECT_ID,
				name: 'Other Credentials',
				type: 'openAiApi',
				scopes: ['credential:read'],
				isManaged: false,
				isGlobal: false,
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: 'cred-123', name: 'OpenAI Credentials' },
			};

			projectRepository.getPersonalProjectForUser.mockResolvedValue({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
			} as Project);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([mockCredential]);

			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(new ForbiddenError("You don't have access to the provided credentials"));
		});

		it('should throw ForbiddenError if personal project is not found', async () => {
			const credentials: INodeCredentials = {
				openAiApi: { id: 'cred-123', name: 'OpenAI Credentials' },
			};

			projectRepository.getPersonalProjectForUser.mockResolvedValue(null);

			await expect(
				service.ensureCredentials(mockUser, 'openai' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(new ForbiddenError('Missing personal project'));
		});

		it('should handle n8n provider by returning null credential ID', async () => {
			const credentials: INodeCredentials = {};

			await expect(
				service.ensureCredentials(mockUser, 'n8n' as ChatHubLLMProvider, credentials, mockTrx),
			).rejects.toThrow(BadRequestError);
		});

		it('should handle custom-agent provider by returning null credential ID', async () => {
			const credentials: INodeCredentials = {};

			await expect(
				service.ensureCredentials(
					mockUser,
					'custom-agent' as ChatHubLLMProvider,
					credentials,
					mockTrx,
				),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('ensureWorkflowCredentials', () => {
		it('should return credential when workflow can use the credential', async () => {
			const mockCredential = mock({
				id: CREDENTIAL_ID,
				projectId: PERSONAL_PROJECT_ID,
				name: 'OpenAI Credentials',
				type: 'openAiApi',
				scopes: ['credential:read'],
				isManaged: false,
				isGlobal: false,
			});

			const credentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({
				id: PERSONAL_PROJECT_ID,
			} as Project);
			credentialsService.findAllCredentialIdsForWorkflow.mockResolvedValue([
				{ id: CREDENTIAL_ID },
				{ id: OTHER_CREDENTIAL_ID },
			] as CredentialsEntity[]);

			const result = await service.ensureWorkflowCredentials(
				'openai' satisfies ChatHubLLMProvider,
				credentials,
				'workflow-123',
			);

			expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith(
				'workflow-123',
			);
			expect(credentialsService.findAllCredentialIdsForWorkflow).toHaveBeenCalledWith(
				'workflow-123',
			);

			expect(result).toEqual({
				id: mockCredential.id,
				projectId: mockCredential.projectId,
			});
		});

		it('should throw BadRequestError when no credentials are provided for workflow', async () => {
			const credentials: INodeCredentials = {};

			await expect(
				service.ensureWorkflowCredentials(
					'openai' as ChatHubLLMProvider,
					credentials,
					'workflow-123',
				),
			).rejects.toThrow(
				new BadRequestError('No credentials provided for the selected model provider'),
			);
		});

		it('should throw ForbiddenError when workflow does not have access to the credential', async () => {
			const credentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({
				id: PERSONAL_PROJECT_ID,
			} as Project);
			credentialsService.findAllCredentialIdsForWorkflow.mockResolvedValue([
				{ id: OTHER_CREDENTIAL_ID },
			] as CredentialsEntity[]);

			await expect(
				service.ensureWorkflowCredentials(
					'openai' satisfies ChatHubLLMProvider,
					credentials,
					'workflow-123',
				),
			).rejects.toThrow(new ForbiddenError("You don't have access to the provided credentials"));
		});

		it('should throw ForbiddenError if workflow owning project is not found', async () => {
			const credentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(
				service.ensureWorkflowCredentials(
					'openai' satisfies ChatHubLLMProvider,
					credentials,
					'workflow-123',
				),
			).rejects.toThrow(new ForbiddenError('Missing owner project for the workflow'));
		});
	});
});

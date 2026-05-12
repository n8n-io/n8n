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

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { ChatHubCredentialsService } from '../chat-hub-credentials.service';

const CREDENTIAL_ID = 'credential-id-123';
const PERSONAL_PROJECT_ID = 'personal-project-id';

describe('ChatHubCredentialsService', () => {
	const credentialsService = mock<CredentialsService>();
	const projectRepository = mock<ProjectRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();

	const service = new ChatHubCredentialsService(
		credentialsService,
		sharedWorkflowRepository,
		credentialsFinderService,
		projectRepository,
	);

	const mockUser = mock<User>({ id: 'user-123' });
	const mockTrx = mock<EntityManager>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('ensureCredentialAccess', () => {
		it('should return credential when user has access and credential is found', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: CREDENTIAL_ID,
				name: 'OpenAI Credentials',
				type: 'openAiApi',
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			const result = await service.ensureCredentialAccess(mockUser, CREDENTIAL_ID);

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				CREDENTIAL_ID,
				mockUser,
				['credential:read'],
			);

			expect(result.id).toEqual(mockCredential.id);
		});

		it('should throw ForbiddenError when user does not have access to the credential', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(service.ensureCredentialAccess(mockUser, CREDENTIAL_ID)).rejects.toThrow(
				new ForbiddenError("You don't have access to the provided credentials"),
			);
		});
	});

	describe('findPersonalProject', () => {
		it('should find personal project', async () => {
			const mockPersonalProject = mock<Project>({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
				type: 'personal',
			});

			projectRepository.getPersonalProjectForUser.mockResolvedValue(mockPersonalProject);

			const result = await service.findPersonalProject(mockUser, mockTrx);

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith(
				mockUser.id,
				mockTrx,
			);
			expect(result).toEqual(mockPersonalProject);
		});

		it('should throw ForbiddenError when no personal project is found', async () => {
			projectRepository.getPersonalProjectForUser.mockResolvedValue(null);

			await expect(service.findPersonalProject(mockUser, mockTrx)).rejects.toThrow(
				new ForbiddenError('Missing personal project'),
			);

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith(
				mockUser.id,
				mockTrx,
			);
		});
	});

	describe('findWorkflowCredentialAndProject', () => {
		it('should find credential ID and owning project for workflow', async () => {
			const mockCredentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			const mockProject = mock<Project>({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
				type: 'personal',
			});

			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(mockProject);
			credentialsService.findAllCredentialIdsForWorkflow.mockResolvedValue([
				mock<CredentialsEntity>({ id: CREDENTIAL_ID }),
			]);
			credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);

			const result = await service.findWorkflowCredentialAndProject(
				'openai',
				mockCredentials,
				'workflow-123',
			);
			expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith(
				'workflow-123',
			);
			expect(result).toEqual({
				credentialId: CREDENTIAL_ID,
				projectId: PERSONAL_PROJECT_ID,
			});
		});

		it('should throw BadRequestError when no credentials provided for the selected model provider', async () => {
			const mockCredentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			await expect(
				service.findWorkflowCredentialAndProject('anthropic', mockCredentials, 'workflow-123'),
			).rejects.toThrow(
				new BadRequestError('No credentials provided for the selected model provider'),
			);
		});

		it("should throw ForbiddenError when user doesn't have access to the provided credentials", async () => {
			const mockCredentials: INodeCredentials = {
				openAiApi: { id: CREDENTIAL_ID, name: 'OpenAI Credentials' },
			};

			const mockProject = mock<Project>({
				id: PERSONAL_PROJECT_ID,
				name: 'Personal Project',
				type: 'personal',
			});

			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(mockProject);
			credentialsService.findAllCredentialIdsForWorkflow.mockResolvedValue([]);
			credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);

			await expect(
				service.findWorkflowCredentialAndProject('openai', mockCredentials, 'workflow-123'),
			).rejects.toThrow(new ForbiddenError("You don't have access to the provided credentials"));
		});
	});
});

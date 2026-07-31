import type {
	AuthenticatedRequest,
	CredentialsEntity,
	CredentialsRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { createRawProjectData } from '@/__tests__/project.test-data';
import type { EventService } from '@/events/event.service';

import type { CredentialRequest } from '@/requests';
import type { CredentialsFinderService } from '../credentials-finder.service';
import { CredentialsController } from '../credentials.controller';
import { CredentialsService } from '../credentials.service';
import { createdCredentialsWithScopes, createNewCredentialsPayload } from './credentials.test-data';

describe('CredentialsController', () => {
	const eventService = mock<EventService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();

	// Mock the credentialsRepository with a working create method
	const credentialsRepository = mock<CredentialsRepository>();

	// real CredentialsService instance with mocked dependencies
	const credentialsService = new CredentialsService(
		credentialsRepository,
		mock(), // sharedCredentialsRepository
		mock(), // ownershipService
		mock(), // logger
		mock(), // errorReporter
		mock(), // credentialsTester
		mock(), // externalHooks
		mock(), // credentialTypes
		mock(), // projectRepository
		mock(), // projectService
		mock(), // roleService
		mock(), // userRepository
		mock(), // credentialsFinderService
		mock(), // credentialsHelper
	);

	// Spy on methods that need to be mocked in tests
	// This allows us to mock specific behavior while keeping real implementations
	// for isChangingExternalSecretExpression and validateExternalSecretsPermissions
	jest.spyOn(credentialsService, 'decrypt');
	jest.spyOn(credentialsService, 'prepareUpdateData');
	jest.spyOn(credentialsService, 'createEncryptedData');
	jest.spyOn(credentialsService, 'getCredentialScopes');
	jest.spyOn(credentialsService, 'update');
	jest.spyOn(credentialsService, 'createUnmanagedCredential');

	const credentialsController = new CredentialsController(
		mock(),
		credentialsService,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		sharedCredentialsRepository,
		mock(),
		eventService,
		credentialsFinderService,
	);

	let req: AuthenticatedRequest;
	const res = mock<Response>();
	beforeAll(() => {
		req = { user: { id: '123' } } as AuthenticatedRequest;
	});

	beforeEach(() => {
		jest.resetAllMocks();
		// Set up credentialsRepository.create to return the input data
		credentialsRepository.create.mockImplementation((data) => data as CredentialsEntity);
	});

	describe('createCredentials', () => {
		it('should create new credentials and emit "credentials-created"', async () => {
			const newCredentialsPayload = createNewCredentialsPayload();

			req.body = newCredentialsPayload;

			const { data, ...payloadWithoutData } = newCredentialsPayload;

			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			const projectOwningCredentialData = createRawProjectData({
				id: newCredentialsPayload.projectId,
			});

			jest
				.mocked(credentialsService.createUnmanagedCredential)
				.mockResolvedValue(createdCredentials);

			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
				projectOwningCredentialData,
			);

			// Act

			const newApiKey = await credentialsController.createCredentials(
				req,
				res,
				newCredentialsPayload,
			);

			// Assert

			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
				newCredentialsPayload,
				req.user,
			);
			expect(sharedCredentialsRepository.findCredentialOwningProject).toHaveBeenCalledWith(
				createdCredentials.id,
			);
			expect(eventService.emit).toHaveBeenCalledWith('credentials-created', {
				user: expect.objectContaining({ id: req.user.id }),
				credentialId: createdCredentials.id,
				credentialType: createdCredentials.type,
				projectId: projectOwningCredentialData.id,
				projectType: projectOwningCredentialData.type,
				publicApi: false,
				uiContext: newCredentialsPayload.uiContext,
			});

			expect(newApiKey).toEqual(createdCredentials);
		});
	});

	describe('updateCredentials', () => {
		const credentialId = 'cred-123';
		const existingCredential = mock<CredentialsEntity>({
			id: credentialId,
			name: 'Test Credential',
			type: 'apiKey',
			isGlobal: false,
			isManaged: false,
		});

		beforeEach(() => {
			jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: 'test-key' });
			jest.mocked(credentialsService.createEncryptedData).mockReturnValue({
				name: 'Updated Credential',
				type: 'apiKey',
				data: 'encrypted-data',
				id: 'cred-123',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);
			jest
				.mocked(credentialsService.getCredentialScopes)
				.mockResolvedValue(['credential:read', 'credential:update'] as any);
		});

		it('should allow owner to set isGlobal to true', async () => {
			// ARRANGE
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					isGlobal: true,
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			jest.mocked(credentialsService.update).mockResolvedValue({
				...existingCredential,
				name: 'Updated Credential',
				isGlobal: true,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(credentialsService.update).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isGlobal: true,
				}),
			);
			expect(eventService.emit).toHaveBeenCalledWith('credentials-updated', {
				user: ownerReq.user,
				credentialType: existingCredential.type,
				credentialId: existingCredential.id,
			});
		});

		it('should allow owner to set isGlobal to false', async () => {
			// ARRANGE
			const globalCredential = mock<CredentialsEntity>({
				...existingCredential,
				isGlobal: true,
			});
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					isGlobal: false,
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(globalCredential);
			jest.mocked(credentialsService.update).mockResolvedValue({
				...globalCredential,
				isGlobal: false,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(credentialsService.update).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isGlobal: false,
				}),
			);
		});

		it('should prevent non-owner from changing isGlobal', async () => {
			// ARRANGE
			const memberReq = {
				user: { id: 'member-id', role: GLOBAL_MEMBER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					isGlobal: true,
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);

			// ACT
			await expect(credentialsController.updateCredentials(memberReq)).rejects.toThrowError(
				'You do not have permission to change global sharing for credentials',
			);

			// ASSERT
			expect(credentialsService.update).not.toHaveBeenCalled();
		});

		it('should prevent non-owner from changing isGlobal to true', async () => {
			// ARRANGE
			const memberReq = {
				user: { id: 'member-id', role: GLOBAL_MEMBER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					isGlobal: false,
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue({
				...existingCredential,
				isGlobal: true,
			});

			// ACT
			await expect(credentialsController.updateCredentials(memberReq)).rejects.toThrowError(
				'You do not have permission to change global sharing for credentials',
			);

			// ASSERT
			expect(credentialsService.update).not.toHaveBeenCalled();
		});

		it('should update credential without changing isGlobal when not provided', async () => {
			// ARRANGE
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					// isGlobal not provided
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			jest.mocked(credentialsService.update).mockResolvedValue({
				...existingCredential,
				name: 'Updated Credential',
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			// Should not include isGlobal in update when not provided
			expect(credentialsService.update).toHaveBeenCalledWith(
				credentialId,
				expect.not.objectContaining({
					isGlobal: expect.anything(),
				}),
			);
		});
	});
});

import type { LicenseState } from '@n8n/backend-common';
import type { AuthenticatedRequest, SharedCredentialsRepository, CredentialsEntity } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { createdCredentialsWithScopes, createNewCredentialsPayload } from './credentials.test-data';
import type { CredentialsFinderService } from '../credentials-finder.service';
import { CredentialsController } from '../credentials.controller';
import type { CredentialsService } from '../credentials.service';

import { createRawProjectData } from '@/__tests__/project.test-data';
import type { EventService } from '@/events/event.service';
import type { CredentialRequest } from '@/requests';

describe('CredentialsController', () => {
	const eventService = mock<EventService>();
	const credentialsService = mock<CredentialsService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const licenseState = mock<LicenseState>();

	const credentialsController = new CredentialsController(
		mock(),
		credentialsService,
		mock(),
		mock(),
		licenseState,
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
	});

	describe('createCredentials', () => {
		it('should create new credentials and emit "credentials-created"', async () => {
			// Arrange

			const newCredentialsPayload = createNewCredentialsPayload();

			req.body = newCredentialsPayload;

			const { data, ...payloadWithoutData } = newCredentialsPayload;

			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			const projectOwningCredentialData = createRawProjectData({
				id: newCredentialsPayload.projectId,
			});

			// @ts-ignore
			credentialsService.createUnmanagedCredential.mockResolvedValue(createdCredentials);

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
				isDynamic: false,
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
			isResolvable: false,
		});

		beforeEach(() => {
			credentialsService.decrypt.mockReturnValue({ apiKey: 'test-key' });
			credentialsService.prepareUpdateData.mockResolvedValue({
				name: 'Updated Credential',
				type: 'apiKey',
				data: { apiKey: 'updated-key' },
			} as any);
			credentialsService.createEncryptedData.mockReturnValue({
				name: 'Updated Credential',
				type: 'apiKey',
				data: 'encrypted-data',
				id: 'cred-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isResolvable: false,
			} as any);
			credentialsService.getCredentialScopes.mockResolvedValue([
				'credential:read',
				'credential:update',
			] as any);
		});

		it('should not allow owner to set isGlobal to true if not licensed', async () => {
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

			licenseState.isSharingLicensed.mockReturnValue(false);

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);

			// ACT
			await expect(credentialsController.updateCredentials(ownerReq)).rejects.toThrowError(
				'You are not licensed for sharing credentials',
			);

			// ASSERT
			expect(credentialsService.update).not.toHaveBeenCalled();
		});

		it('should allow owner to set isGlobal to true if licensed', async () => {
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

			licenseState.isSharingLicensed.mockReturnValue(true);

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			credentialsService.update.mockResolvedValue({
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
				isDynamic: false,
			});
		});

		it('should allow owner to set isGlobal to false if licensed', async () => {
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

			licenseState.isSharingLicensed.mockReturnValue(true);

			credentialsFinderService.findCredentialForUser.mockResolvedValue(globalCredential);
			credentialsService.update.mockResolvedValue({
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

		it('should prevent non-owner from changing isGlobal if licensed', async () => {
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

			licenseState.isSharingLicensed.mockReturnValue(true);

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

			licenseState.isSharingLicensed.mockReturnValue(true);

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
			credentialsService.update.mockResolvedValue({
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

		it('should update isResolvable when provided', async () => {
			// ARRANGE
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					isResolvable: true,
				},
			} as unknown as CredentialRequest.Update;

			const existingCredentialWithResolvable = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: false,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(
				existingCredentialWithResolvable,
			);
			credentialsService.createEncryptedData.mockReturnValue({
				name: 'Updated Credential',
				type: 'apiKey',
				data: 'encrypted-data',
				id: 'cred-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isResolvable: true,
			} as any);
			credentialsService.update.mockResolvedValue({
				...existingCredentialWithResolvable,
				name: 'Updated Credential',
				isResolvable: true,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(credentialsService.update).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isResolvable: true,
				}),
			);
		});

		it('should keep existing isResolvable value when not provided', async () => {
			// ARRANGE
			const existingCredentialWithResolvable = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'updated-key' },
					// isResolvable not provided
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(
				existingCredentialWithResolvable,
			);
			credentialsService.createEncryptedData.mockReturnValue({
				name: 'Updated Credential',
				type: 'apiKey',
				data: 'encrypted-data',
				id: 'cred-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isResolvable: true,
			} as any);
			credentialsService.update.mockResolvedValue({
				...existingCredentialWithResolvable,
				name: 'Updated Credential',
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(credentialsService.update).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isResolvable: true, // Should keep the existing value
				}),
			);
		});
	});
});

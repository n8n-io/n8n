import type { MockInstance } from 'vitest';
vi.mock('@/generic-helpers', () => ({
	validateEntity: vi.fn(),
}));

import type { LicenseState } from '@n8n/backend-common';
import type {
	AuthenticatedRequest,
	ICredentialsDb,
	Project,
	SharedCredentials,
	SharedCredentialsRepository,
	CredentialsEntity,
	CredentialsRepository,
} from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import * as checkAccess from '@/permissions.ee/check-access';
import type { CredentialRequest } from '@/requests';

import { createNewCredentialsPayload, createdCredentialsWithScopes } from './credentials.test-data';
import type { CredentialDependencyService } from '../credential-dependency.service';
import type { CredentialsFinderService } from '../credentials-finder.service';
import { CredentialsController } from '../credentials.controller';
import { CredentialsService } from '../credentials.service';
import * as validation from '../validation';

const originalValidateExternalSecretsPermissions = validation.validateExternalSecretsPermissions;

describe('CredentialsController', () => {
	type ControllerEventService = ConstructorParameters<typeof CredentialsController>[9];
	const eventService = mock<ControllerEventService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const licenseState = mock<LicenseState>();
	const credentialsOverwrites = mock<ConstructorParameters<typeof CredentialsController>[12]>();

	// Mock the credentialsRepository with a working create method
	const credentialsRepository = mock<CredentialsRepository>();

	// real CredentialsService instance with mocked dependencies
	const credentialsService = new CredentialsService(
		credentialsRepository,
		mock<CredentialDependencyService>(),
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
		mock(), // externalSecretsConfig
		mock(), // externalSecretsProviderAccessCheckService
		mock(), // connectionStatusProxy
	);

	// Spy on methods that need to be mocked in tests
	// This allows us to mock specific behavior while keeping real implementations
	// for isChangingExternalSecretExpression and validateExternalSecretsPermissions
	let decryptSpy: MockInstance;
	let createEncryptedDataSpy: MockInstance;
	let getCredentialScopesSpy: MockInstance;
	let updateSpy: MockInstance;
	let createUnmanagedCredentialSpy: MockInstance;
	let findCredentialOwningProjectSpy: MockInstance;
	let emitSpy: MockInstance;

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
		mock(), // connectionStatusProxy
		credentialsOverwrites,
	);

	let req: AuthenticatedRequest;
	const res = mock<Response>();
	beforeAll(() => {
		req = { user: { id: '123' } } as AuthenticatedRequest;
	});

	beforeEach(() => {
		vi.resetAllMocks();
		decryptSpy = vi.spyOn(credentialsService, 'decrypt');
		createEncryptedDataSpy = vi.spyOn(credentialsService, 'createEncryptedData');
		getCredentialScopesSpy = vi.spyOn(credentialsService, 'getCredentialScopes');
		updateSpy = vi.spyOn(credentialsService, 'update');
		createUnmanagedCredentialSpy = vi.spyOn(credentialsService, 'createUnmanagedCredential');
		findCredentialOwningProjectSpy = sharedCredentialsRepository.findCredentialOwningProject;
		emitSpy = eventService.emit;
		// Set up credentialsRepository.create to return the input data
		credentialsRepository.create.mockImplementation((data) => data as CredentialsEntity);
	});

	describe('createCredentials', () => {
		it('should create new credentials and emit "credentials-created"', async () => {
			const newCredentialsPayload = createNewCredentialsPayload();

			req.body = newCredentialsPayload;

			const { data, ...payloadWithoutData } = newCredentialsPayload;

			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			const projectOwningCredentialData = mock<Project>({
				id: newCredentialsPayload.projectId,
				type: 'team',
			});

			createUnmanagedCredentialSpy.mockResolvedValue(createdCredentials);

			findCredentialOwningProjectSpy.mockResolvedValue(projectOwningCredentialData);

			// Act

			const newApiKey = await credentialsController.createCredentials(
				req,
				res,
				newCredentialsPayload,
			);

			// Assert

			expect(createUnmanagedCredentialSpy).toHaveBeenCalledWith(newCredentialsPayload, req.user);
			expect(findCredentialOwningProjectSpy).toHaveBeenCalledWith(createdCredentials.id);
			expect(emitSpy).toHaveBeenCalledTimes(1);
			const [eventName, eventPayload] = emitSpy.mock.calls[0];
			expect(eventName).toBe('credentials-created');
			expect(eventPayload).toMatchObject({
				credentialId: createdCredentials.id,
				credentialType: createdCredentials.type,
				projectId: projectOwningCredentialData.id,
				projectType: projectOwningCredentialData.type,
				publicApi: false,
				uiContext: newCredentialsPayload.uiContext,
				isDynamic: false,
				jweEnabled: false,
			});
			expect((eventPayload as { user: { id: string } }).user.id).toBe('123');

			expect(newApiKey).toEqual(createdCredentials);
		});

		it('should emit "credentials-created" with jweEnabled true when payload enables JWE', async () => {
			const newCredentialsPayload = createNewCredentialsPayload({
				data: { clientId: 'cid', jweEnabled: true },
			});

			req.body = newCredentialsPayload;

			const { data, ...payloadWithoutData } = newCredentialsPayload;
			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			createUnmanagedCredentialSpy.mockResolvedValue(createdCredentials);
			findCredentialOwningProjectSpy.mockResolvedValue(mock<Project>());

			await credentialsController.createCredentials(req, res, newCredentialsPayload);

			const [eventName, eventPayload] = emitSpy.mock.calls[0];
			expect(eventName).toBe('credentials-created');
			expect(eventPayload).toMatchObject({ jweEnabled: true });
		});

		it('should emit "credentials-created" with managed-auth flags derived from overwrites', async () => {
			const newCredentialsPayload = createNewCredentialsPayload();
			req.body = newCredentialsPayload;
			const { data, ...payloadWithoutData } = newCredentialsPayload;
			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			createUnmanagedCredentialSpy.mockResolvedValue(createdCredentials);
			findCredentialOwningProjectSpy.mockResolvedValue(mock<Project>());
			credentialsOverwrites.supportsManagedAuth.mockReturnValue(true);
			credentialsOverwrites.usesManagedAuth.mockReturnValue(true);

			await credentialsController.createCredentials(req, res, newCredentialsPayload);

			expect(credentialsOverwrites.supportsManagedAuth).toHaveBeenCalledWith(
				createdCredentials.type,
			);
			expect(credentialsOverwrites.usesManagedAuth).toHaveBeenCalledWith(
				createdCredentials.type,
				newCredentialsPayload.data,
			);
			const [, eventPayload] = emitSpy.mock.calls[0];
			expect(eventPayload).toMatchObject({ supportsManagedAuth: true, usesManagedAuth: true });
		});

		it('should emit "private-credential-created" when credential is created as resolvable', async () => {
			const newCredentialsPayload = createNewCredentialsPayload();
			req.body = newCredentialsPayload;
			const { data, ...payloadWithoutData } = newCredentialsPayload;
			const createdCredentials = createdCredentialsWithScopes({
				...payloadWithoutData,
				isResolvable: true,
			});
			const project = mock<Project>({ id: 'p1', type: 'team' });

			createUnmanagedCredentialSpy.mockResolvedValue(createdCredentials);
			findCredentialOwningProjectSpy.mockResolvedValue(project);

			await credentialsController.createCredentials(req, res, newCredentialsPayload);

			expect(emitSpy).toHaveBeenCalledWith('private-credential-created', {
				user: req.user,
				credentialType: createdCredentials.type,
				credentialId: createdCredentials.id,
				projectId: project.id,
				projectType: project.type,
			});
		});

		it('should not emit "private-credential-created" when credential is not resolvable', async () => {
			const newCredentialsPayload = createNewCredentialsPayload();
			req.body = newCredentialsPayload;
			const { data, ...payloadWithoutData } = newCredentialsPayload;
			const createdCredentials = createdCredentialsWithScopes(payloadWithoutData);

			createUnmanagedCredentialSpy.mockResolvedValue(createdCredentials);
			findCredentialOwningProjectSpy.mockResolvedValue(mock<Project>());

			await credentialsController.createCredentials(req, res, newCredentialsPayload);

			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-created');
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
			shared: [
				{
					role: 'credential:owner',
					projectId: 'WHwt9vP3keCUvmB5',
					credentialsId: credentialId,
				} as SharedCredentials,
			],
		});

		const getEncryptedCredential = (isResolvable = false): ICredentialsDb => ({
			name: 'Updated Credential',
			type: 'apiKey',
			data: 'encrypted-data',
			id: credentialId,
			createdAt: new Date(),
			updatedAt: new Date(),
			isResolvable,
		});

		beforeEach(() => {
			decryptSpy.mockResolvedValue({ apiKey: 'test-key' });
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential());
			getCredentialScopesSpy.mockResolvedValue([
				'credential:read' as Scope,
				'credential:update' as Scope,
			]);
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
			expect(updateSpy).not.toHaveBeenCalled();
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
			updateSpy.mockResolvedValue({
				...existingCredential,
				name: 'Updated Credential',
				isGlobal: true,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(updateSpy).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isGlobal: true,
				}),
				expect.any(Object),
				expect.any(Object),
			);
			expect(emitSpy).toHaveBeenCalledWith('credentials-updated', {
				user: ownerReq.user,
				credentialType: existingCredential.type,
				credentialId: existingCredential.id,
				isDynamic: false,
				usesExternalSecrets: false,
				jweEnabled: false,
			});
		});

		it('should emit "credentials-updated" with jweEnabled true when JWE is enabled in payload', async () => {
			// ARRANGE
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'oAuth2Api',
					data: { clientId: 'cid', jweEnabled: true },
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			updateSpy.mockResolvedValue({
				...existingCredential,
				name: 'Updated Credential',
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(emitSpy).toHaveBeenCalledWith(
				'credentials-updated',
				expect.objectContaining({ jweEnabled: true }),
			);
		});

		it('should emit "credentials-updated" with managed-auth flags derived from overwrites', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: {
					name: 'Updated Credential',
					type: 'oAuth2Api',
					data: { clientId: 'cid' },
				},
			} as unknown as CredentialRequest.Update;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			updateSpy.mockResolvedValue({ ...existingCredential, name: 'Updated Credential' });
			credentialsOverwrites.supportsManagedAuth.mockReturnValue(true);
			credentialsOverwrites.usesManagedAuth.mockReturnValue(true);

			await credentialsController.updateCredentials(ownerReq);

			expect(credentialsOverwrites.supportsManagedAuth).toHaveBeenCalledWith(
				existingCredential.type,
			);
			expect(emitSpy).toHaveBeenCalledWith(
				'credentials-updated',
				expect.objectContaining({ supportsManagedAuth: true, usesManagedAuth: true }),
			);
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
			updateSpy.mockResolvedValue({
				...globalCredential,
				isGlobal: false,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(updateSpy).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isGlobal: false,
				}),
				expect.any(Object),
				expect.any(Object),
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
			expect(updateSpy).not.toHaveBeenCalled();
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
			expect(updateSpy).not.toHaveBeenCalled();
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
			updateSpy.mockResolvedValue({
				...existingCredential,
				name: 'Updated Credential',
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			// Should not include isGlobal in update when not provided
			expect(updateSpy).toHaveBeenCalledWith(
				credentialId,
				expect.any(Object),
				expect.any(Object),
				expect.any(Object),
			);
			const updatePayload = updateSpy.mock.calls[0][1];
			expect(updatePayload).not.toHaveProperty('isGlobal');
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
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({
				...existingCredentialWithResolvable,
				name: 'Updated Credential',
				isResolvable: true,
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(updateSpy).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isResolvable: true,
				}),
				expect.any(Object),
				expect.any(Object),
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
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({
				...existingCredentialWithResolvable,
				name: 'Updated Credential',
			});

			// ACT
			await credentialsController.updateCredentials(ownerReq);

			// ASSERT
			expect(updateSpy).toHaveBeenCalledWith(
				credentialId,
				expect.objectContaining({
					isResolvable: true, // Should keep the existing value
				}),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should throw error when editing external secret expression without permission', async () => {
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);
			const memberReq = {
				user: { id: 'member-id', role: GLOBAL_MEMBER_ROLE },
				params: { credentialId },
				body: {
					data: { apiKey: '{{ $secrets.newKey }}' }, // E.g. changed from $secrets.oldKey
				},
			} as unknown as CredentialRequest.Update;
			const existingCredentialWithSecret = mock<CredentialsEntity>({
				...existingCredential,
			});
			const validateExternalSecretsPermissionsSpy = vi
				.spyOn(validation, 'validateExternalSecretsPermissions')
				.mockImplementation(originalValidateExternalSecretsPermissions);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(
				existingCredentialWithSecret,
			);
			// Mock setup: existing credential already has a secret expression
			decryptSpy.mockResolvedValue({ apiKey: '$secrets.oldKey' });

			await expect(credentialsController.updateCredentials(memberReq)).rejects.toThrow(
				'Lacking permissions to reference external secrets in credentials',
			);
			expect(validateExternalSecretsPermissionsSpy).toHaveBeenCalledWith({
				user: memberReq.user,
				projectId: existingCredential.shared[0].projectId,
				dataToSave: memberReq.body.data,
				decryptedExistingData: { apiKey: '$secrets.oldKey' },
			});
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it('should throw error when adding new external secret expression without permission', async () => {
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);
			const memberReq = {
				user: { id: 'member-id', role: GLOBAL_MEMBER_ROLE },
				params: { credentialId },
				body: {
					data: { apiKey: '{{ $secrets.myVault.myKey }}' }, // Changed from regular key to external secret
				},
			} as unknown as CredentialRequest.Update;
			const validateExternalSecretsPermissionsSpy = vi
				.spyOn(validation, 'validateExternalSecretsPermissions')
				.mockImplementation(originalValidateExternalSecretsPermissions);

			// Mock setup: existing credential has no external secret yet
			credentialsFinderService.findCredentialForUser.mockResolvedValue(existingCredential);
			decryptSpy.mockResolvedValue({ apiKey: 'regular-key' });

			await expect(credentialsController.updateCredentials(memberReq)).rejects.toThrow(
				'Lacking permissions to reference external secrets in credentials',
			);
			expect(validateExternalSecretsPermissionsSpy).toHaveBeenCalledWith({
				user: memberReq.user,
				projectId: existingCredential.shared[0].projectId,
				dataToSave: memberReq.body.data,
				decryptedExistingData: { apiKey: 'regular-key' },
			});
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it('should emit "private-credential-toggled-to-private" when toggling static to private', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { apiKey: 'k' }, isResolvable: true },
			} as unknown as CredentialRequest.Update;

			const staticCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: false,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({ ...staticCredential, isResolvable: true });

			await credentialsController.updateCredentials(ownerReq);

			expect(emitSpy).toHaveBeenCalledWith('private-credential-toggled-to-private', {
				user: ownerReq.user,
				credentialType: staticCredential.type,
				credentialId: staticCredential.id,
			});
			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-toggled-to-static');
		});

		it('should emit "private-credential-toggled-to-static" when toggling private to static', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { apiKey: 'k' }, isResolvable: false },
			} as unknown as CredentialRequest.Update;

			const privateCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(false));
			updateSpy.mockResolvedValue({ ...privateCredential, isResolvable: false });

			await credentialsController.updateCredentials(ownerReq);

			expect(emitSpy).toHaveBeenCalledWith('private-credential-toggled-to-static', {
				user: ownerReq.user,
				credentialType: privateCredential.type,
				credentialId: privateCredential.id,
			});
			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-toggled-to-private');
		});

		it('should delete user entries and emit "private-credential-connections-cleared" when a shared field changes on a private credential', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { clientId: 'new-client-id' }, isResolvable: true },
			} as unknown as CredentialRequest.Update;

			const privateCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({ ...privateCredential, isResolvable: true });
			const getChangedSharedFieldsSpy = vi
				.spyOn(credentialsService, 'getChangedSharedFields')
				.mockResolvedValue(['clientId']);

			await credentialsController.updateCredentials(ownerReq);

			expect(getChangedSharedFieldsSpy).toHaveBeenCalled();
			expect(updateSpy).toHaveBeenCalledWith(credentialId, expect.any(Object), expect.any(Object), {
				deleteUserEntries: true,
			});
			expect(emitSpy).toHaveBeenCalledWith('private-credential-connections-cleared', {
				user: ownerReq.user,
				credentialType: privateCredential.type,
				credentialId: privateCredential.id,
			});
		});

		it('should not delete user entries when no shared field changed on a private credential', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { clientId: 'same' }, isResolvable: true },
			} as unknown as CredentialRequest.Update;

			const privateCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({ ...privateCredential, isResolvable: true });
			vi.spyOn(credentialsService, 'getChangedSharedFields').mockResolvedValue([]);

			await credentialsController.updateCredentials(ownerReq);

			expect(updateSpy).toHaveBeenCalledWith(credentialId, expect.any(Object), expect.any(Object), {
				deleteUserEntries: false,
			});
			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-connections-cleared');
		});

		it('should not check shared fields when toggling private to static (entries deleted by toggle)', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { clientId: 'new-client-id' }, isResolvable: false },
			} as unknown as CredentialRequest.Update;

			const privateCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(false));
			updateSpy.mockResolvedValue({ ...privateCredential, isResolvable: false });
			const getChangedSharedFieldsSpy = vi.spyOn(credentialsService, 'getChangedSharedFields');

			await credentialsController.updateCredentials(ownerReq);

			expect(getChangedSharedFieldsSpy).not.toHaveBeenCalled();
			expect(updateSpy).toHaveBeenCalledWith(credentialId, expect.any(Object), expect.any(Object), {
				deleteUserEntries: true,
			});
		});

		it('should not emit toggle events when resolvable state is unchanged', async () => {
			const ownerReq = {
				user: { id: 'owner-id', role: GLOBAL_OWNER_ROLE },
				params: { credentialId },
				body: { data: { apiKey: 'k' }, isResolvable: true },
			} as unknown as CredentialRequest.Update;

			const privateCredential = mock<CredentialsEntity>({
				...existingCredential,
				isResolvable: true,
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			createEncryptedDataSpy.mockResolvedValue(getEncryptedCredential(true));
			updateSpy.mockResolvedValue({ ...privateCredential, isResolvable: true });

			await credentialsController.updateCredentials(ownerReq);

			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-toggled-to-private');
			expect(emittedEventNames).not.toContain('private-credential-toggled-to-static');
		});
	});

	describe('deleteCredentials', () => {
		const credentialId = 'cred-del-1';

		it('should emit "private-credential-deleted" when deleting a resolvable credential', async () => {
			const privateCredential = mock<CredentialsEntity>({
				id: credentialId,
				type: 'gmailOAuth2',
				isResolvable: true,
			});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(privateCredential);
			vi.spyOn(credentialsService, 'delete').mockResolvedValue(undefined);

			const deleteReq = {
				user: { id: 'u1' },
				params: { credentialId },
			} as unknown as CredentialRequest.Delete;

			await credentialsController.deleteCredentials(deleteReq);

			expect(emitSpy).toHaveBeenCalledWith('private-credential-deleted', {
				user: deleteReq.user,
				credentialType: privateCredential.type,
				credentialId: privateCredential.id,
			});
		});

		it('should not emit "private-credential-deleted" when deleting a static credential', async () => {
			const staticCredential = mock<CredentialsEntity>({
				id: credentialId,
				type: 'gmailOAuth2',
				isResolvable: false,
			});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(staticCredential);
			vi.spyOn(credentialsService, 'delete').mockResolvedValue(undefined);

			const deleteReq = {
				user: { id: 'u1' },
				params: { credentialId },
			} as unknown as CredentialRequest.Delete;

			await credentialsController.deleteCredentials(deleteReq);

			const emittedEventNames = emitSpy.mock.calls.map((call) => call[0]);
			expect(emittedEventNames).not.toContain('private-credential-deleted');
		});
	});
});

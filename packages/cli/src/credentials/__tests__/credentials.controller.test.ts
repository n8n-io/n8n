import type { AuthenticatedRequest, SharedCredentialsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { createRawProjectData } from '@/__tests__/project.test-data';
import type { EventService } from '@/events/event.service';

import { createdCredentialsWithScopes, createNewCredentialsPayload } from './credentials.test-data';
import { CredentialsController } from '../credentials.controller';
import type { CredentialsService } from '../credentials.service';

describe('CredentialsController', () => {
	const eventService = mock<EventService>();
	const credentialsService = mock<CredentialsService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();

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
		mock(),
	);

	let req: AuthenticatedRequest;
	const res = mock<Response>();
	beforeAll(() => {
		req = { user: { id: '123' } } as AuthenticatedRequest;
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
			});

			expect(newApiKey).toEqual(createdCredentials);
		});
	});
});

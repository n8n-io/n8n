import { mock } from 'jest-mock-extended';

import { createRawProjectData } from '@/__tests__/project.test-data';
import type { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import type { EventService } from '@/events/event.service';
import type { AuthenticatedRequest } from '@/requests';

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
	);

	let req: AuthenticatedRequest;
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

			credentialsService.createCredential.mockResolvedValue(createdCredentials);

			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
				projectOwningCredentialData,
			);

			// Act

			const newApiKey = await credentialsController.createCredentials(req);

			// Assert

			expect(credentialsService.createCredential).toHaveBeenCalledWith(
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

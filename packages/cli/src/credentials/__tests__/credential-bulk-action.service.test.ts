import type { CredentialsEntity, Project, User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { CredentialBulkActionService } from '../credential-bulk-action.service';
import type { AuthorizedCredential, CredentialsFinderService } from '../credentials-finder.service';
import type { CredentialsService } from '../credentials.service';
import type { EnterpriseCredentialsService } from '../credentials.service.ee';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';

describe('CredentialBulkActionService', () => {
	const user = mock<User>({ id: 'user-1' });
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsService = mock<CredentialsService>();
	const enterpriseCredentialsService = mock<EnterpriseCredentialsService>();
	const projectService = mock<ProjectService>();
	const eventService = mock<EventService>();
	let service: CredentialBulkActionService;

	const authorize = <S extends Scope>(
		credential: CredentialsEntity,
		scope: S,
	): AuthorizedCredential<S> => ({ credential, scope, userId: user.id }) as AuthorizedCredential<S>;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CredentialBulkActionService(
			credentialsFinderService,
			credentialsService,
			enterpriseCredentialsService,
			projectService,
			eventService,
		);
	});

	it('rejects the whole request when one credential is inaccessible', async () => {
		credentialsFinderService.findAuthorizedCredentialsByIdsForUser.mockResolvedValue([
			authorize(mock<CredentialsEntity>({ id: 'credential-1' }), 'credential:delete'),
		]);

		await expect(service.delete(user, ['credential-1', 'credential-2'])).rejects.toBeInstanceOf(
			UnprocessableRequestError,
		);
		expect(credentialsService.deleteAuthorized).not.toHaveBeenCalled();
	});

	it('finishes a failing parallel batch and stops before the next batch', async () => {
		const credentials = Array.from({ length: 6 }, (_, index) =>
			mock<CredentialsEntity>({
				id: `credential-${index + 1}`,
				type: 'testApi',
				isResolvable: false,
			}),
		);
		credentialsFinderService.findAuthorizedCredentialsByIdsForUser.mockResolvedValue(
			credentials.map((credential) => authorize(credential, 'credential:delete')),
		);
		credentialsService.deleteAuthorized.mockImplementation(async (_user, authorized) => {
			if (authorized.credential.id === 'credential-2') throw new Error('hook rejected');
		});

		await expect(
			service.delete(
				user,
				credentials.map(({ id }) => id),
			),
		).resolves.toEqual({
			status: 'partial',
			results: [
				{ credentialId: 'credential-1', status: 'completed' },
				{
					credentialId: 'credential-2',
					status: 'failed',
					reason: 'runtimeFailure',
					message: 'hook rejected',
				},
				{ credentialId: 'credential-3', status: 'completed' },
				{ credentialId: 'credential-4', status: 'completed' },
				{ credentialId: 'credential-5', status: 'completed' },
				{ credentialId: 'credential-6', status: 'notAttempted' },
			],
		});
		expect(credentialsService.deleteAuthorized).toHaveBeenCalledTimes(5);
		expect(eventService.emit).toHaveBeenCalledTimes(4);
	});

	it('preflights every transfer before moving any credential', async () => {
		const destination = mock<Project>({ id: 'project-1' });
		const credentials = ['credential-1', 'credential-2'].map((id) =>
			mock<CredentialsEntity>({ id }),
		);
		projectService.getProjectWithScope.mockResolvedValue(destination);
		credentialsFinderService.findAuthorizedCredentialsByIdsForUser.mockResolvedValue(
			credentials.map((credential) => authorize(credential, 'credential:move')),
		);
		enterpriseCredentialsService.validateTransferAuthorized.mockRejectedValueOnce(
			new Error('same destination'),
		);

		await expect(
			service.transfer(
				user,
				credentials.map(({ id }) => id),
				destination.id,
			),
		).rejects.toBeInstanceOf(UnprocessableRequestError);
		expect(enterpriseCredentialsService.transferAuthorized).not.toHaveBeenCalled();
	});
});

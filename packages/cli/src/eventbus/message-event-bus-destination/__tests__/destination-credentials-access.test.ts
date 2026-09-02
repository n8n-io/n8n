import type { CredentialsEntity, User } from '@n8n/db';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { assertUserCanUseDestinationCredentials } from '../destination-credentials-access';

describe('assertUserCanUseDestinationCredentials', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const user = mock<User>();

	beforeEach(() => jest.resetAllMocks());

	it('does nothing when no credentials are referenced', async () => {
		await expect(
			assertUserCanUseDestinationCredentials(credentialsFinderService, user, {}),
		).resolves.toBeUndefined();
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
	});

	it('skips references without an id', async () => {
		const options = {
			credentials: { httpHeaderAuth: { id: null, name: 'unsaved' } },
		} as unknown as MessageEventBusDestinationOptions;

		await expect(
			assertUserCanUseDestinationCredentials(credentialsFinderService, user, options),
		).resolves.toBeUndefined();
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
	});

	it('throws ForbiddenError when the user cannot access a referenced credential', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		const options = {
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'secret' } },
		} as unknown as MessageEventBusDestinationOptions;

		await expect(
			assertUserCanUseDestinationCredentials(credentialsFinderService, user, options),
		).rejects.toThrow(ForbiddenError);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
			'credential:read',
		]);
	});

	it('resolves when the user can access every referenced credential', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());
		const options = {
			credentials: {
				httpHeaderAuth: { id: 'cred-1', name: 'secret' },
				httpBasicAuth: { id: 'cred-2', name: 'secret2' },
			},
		} as unknown as MessageEventBusDestinationOptions;

		await expect(
			assertUserCanUseDestinationCredentials(credentialsFinderService, user, options),
		).resolves.toBeUndefined();
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledTimes(2);
	});
});

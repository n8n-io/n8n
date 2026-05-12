import type { CredentialListItem } from '@n8n/agents';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';

function credential(overrides: Partial<CredentialsEntity>): CredentialsEntity {
	return {
		id: 'cred-1',
		name: 'Slack',
		type: 'slackApi',
		...overrides,
	} as CredentialsEntity;
}

function listItem(overrides: Partial<CredentialListItem>): CredentialListItem {
	return {
		id: 'cred-1',
		name: 'Slack',
		type: 'slackApi',
		...overrides,
	};
}

describe('AgentsCredentialProvider', () => {
	it('lists workflow-scoped credentials when a request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		const user = { id: 'user-1' } as User;
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				...listItem({ id: 'allowed' }),
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
			},
		]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1', user);

		await expect(provider.list()).resolves.toEqual([
			{ id: 'allowed', name: 'Slack', type: 'slackApi' },
		]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'project-1',
		});
		expect(credentialsService.findAllCredentialIdsForProject).not.toHaveBeenCalled();
	});

	it('keeps project-scoped listing when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			credential({ id: 'project-cred', name: 'Project Slack' }),
		]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.list()).resolves.toEqual([
			{ id: 'project-cred', name: 'Project Slack', type: 'slackApi' },
		]);
		expect(credentialsService.findAllCredentialIdsForProject).toHaveBeenCalledWith('project-1');
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	it('resolves only credentials included in the workflow-scoped user list', async () => {
		const credentialsService = mock<CredentialsService>();
		const user = { id: 'user-1' } as User;
		const allowedCredential = credential({ id: 'allowed', name: 'Allowed Slack' });
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				...listItem({ id: 'allowed', name: 'Allowed Slack' }),
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
			},
		]);
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			allowedCredential,
			credential({ id: 'project-only', name: 'Project Only Slack' }),
		]);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1', user);

		await expect(provider.resolve('project-only')).rejects.toThrow(
			'Credential "project-only" not found or not accessible',
		);
		await expect(provider.resolve('allowed')).resolves.toEqual({ apiKey: 'secret' });
		expect(credentialsService.decrypt).toHaveBeenCalledWith(allowedCredential, true);
	});
});

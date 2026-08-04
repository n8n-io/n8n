import type { CredentialListItem } from '@n8n/agents';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

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
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
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

	it('returns project credentials when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			credential({ id: 'project-cred', name: 'Project Slack' }),
		]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.list()).resolves.toEqual([
			{ id: 'project-cred', name: 'Project Slack', type: 'slackApi' },
		]);
		expect(credentialsService.findAllCredentialIdsForProject).toHaveBeenCalledWith('project-1');
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	it('returns global credentials when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([
			credential({ id: 'global-cred', name: 'Global OpenAI', type: 'openAiApi' }),
		]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.list()).resolves.toEqual([
			{ id: 'global-cred', name: 'Global OpenAI', type: 'openAiApi' },
		]);
		expect(credentialsService.findAllGlobalCredentialIds).toHaveBeenCalled();
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	it('merges project and global credentials without duplicates when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		const sharedCred = credential({ id: 'shared-cred', name: 'Shared Slack' });
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			credential({ id: 'project-cred', name: 'Project Slack' }),
			sharedCred,
		]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([
			sharedCred,
			credential({ id: 'global-cred', name: 'Global OpenAI', type: 'openAiApi' }),
		]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.list()).resolves.toEqual([
			{ id: 'project-cred', name: 'Project Slack', type: 'slackApi' },
			{ id: 'shared-cred', name: 'Shared Slack', type: 'slackApi' },
			{ id: 'global-cred', name: 'Global OpenAI', type: 'openAiApi' },
		]);
	});

	it('resolves a project credential when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		const projectCred = credential({ id: 'project-cred', name: 'Project Slack' });
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([projectCred]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'project-secret' });

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.resolve('project-cred')).resolves.toEqual({ apiKey: 'project-secret' });
		expect(credentialsService.decrypt).toHaveBeenCalledWith(projectCred, true);
	});

	it('resolves a global credential when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		const globalCred = credential({ id: 'global-cred', name: 'Global OpenAI', type: 'openAiApi' });
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([globalCred]);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'global-secret' });

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.resolve('global-cred')).resolves.toEqual({ apiKey: 'global-secret' });
		expect(credentialsService.decrypt).toHaveBeenCalledWith(globalCred, true);
	});

	it('rejects resolve for a credential not in project or global scope when no request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			credential({ id: 'project-cred' }),
		]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([
			credential({ id: 'global-cred', type: 'openAiApi' }),
		]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1');

		await expect(provider.resolve('unknown-cred')).rejects.toThrow(
			'Credential "unknown-cred" not found or not accessible',
		);
	});

	it('resolves a credential the user can access when a request user is provided', async () => {
		const credentialsService = mock<CredentialsService>();
		const user = { id: 'user-1' } as User;
		const projectCred = credential({ id: 'allowed', name: 'Slack' });
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				...listItem({ id: 'allowed' }),
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([projectCred]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1', user);

		await expect(provider.resolve('allowed')).resolves.toEqual({ apiKey: 'secret' });
		expect(credentialsService.decrypt).toHaveBeenCalledWith(projectCred, true);
	});

	it('rejects resolve for a credential accessible to the project but not to the request user', async () => {
		const credentialsService = mock<CredentialsService>();
		const user = { id: 'user-1' } as User;
		// The user has no accessible credentials, but the project itself can
		// see `forbidden-cred` — this must not be resolvable/decryptable by the user.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			credential({ id: 'forbidden-cred' }),
		]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);

		const provider = new AgentsCredentialProvider(credentialsService, 'project-1', user);

		await expect(provider.resolve('forbidden-cred')).rejects.toThrow(
			'Credential "forbidden-cred" not found or not accessible',
		);
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});
});

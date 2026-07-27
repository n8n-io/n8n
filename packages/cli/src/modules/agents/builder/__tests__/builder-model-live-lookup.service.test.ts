import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { BuilderModelLiveLookupService } from '../builder-model-live-lookup.service';

const listModelsForProvider = vi.fn();
vi.mock('@n8n/ai-utilities/model-discovery', () => ({
	listModelsForProvider: (...args: unknown[]) => listModelsForProvider(...args) as unknown,
}));

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';

function makeService() {
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);

	const service = new BuilderModelLiveLookupService(
		credentialsService,
		credentialsFinderService,
		outboundHttp,
	);
	return { service, credentialsService, credentialsFinderService };
}

function usable(id: string, type: string) {
	return [{ id, name: 'My Credential', type }] as Awaited<
		ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
	>;
}

describe('BuilderModelLiveLookupService', () => {
	beforeEach(() => {
		listModelsForProvider.mockReset();
	});

	it('lists models for a credential the user can use in the project', async () => {
		const { service, credentialsService, credentialsFinderService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsFinderService.findCredentialById.mockResolvedValue(mock<CredentialsEntity>());
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'sk-key', url: 'https://proxy.local' });
		listModelsForProvider.mockResolvedValue([
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);

		const result = await service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic');

		expect(result).toEqual([{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
		});
		// Credential fields are mapped for the provider (anthropic: apiKey + url→baseURL).
		expect(listModelsForProvider).toHaveBeenCalledWith(
			'anthropic',
			expect.objectContaining({ apiKey: 'sk-key', baseURL: 'https://proxy.local' }),
		);
	});

	it('treats an empty provider response as a failed lookup', async () => {
		const { service, credentialsService, credentialsFinderService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'anthropicApi'),
		);
		credentialsFinderService.findCredentialById.mockResolvedValue(mock<CredentialsEntity>());
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'sk-key' });
		// An empty list from a chat provider is far more likely a broken request
		// or drifted response shape than a real zero-model account — callers must
		// fall back rather than prune everything.
		listModelsForProvider.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('returned no models');
	});

	it('rejects a credential that is not available in the project', async () => {
		const { service, credentialsService } = makeService();
		// The user can read this credential, but it is not in the project's set.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		await expect(
			service.list(user, projectId, 'cred-other-project', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});

	it('rejects a credential whose type does not match the provider', async () => {
		const { service, credentialsService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			usable('cred-1', 'openAiApi'),
		);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', 'anthropic'),
		).rejects.toThrow('not found or not accessible');
		expect(listModelsForProvider).not.toHaveBeenCalled();
	});
});

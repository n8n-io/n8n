import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentsCredentialProvider } from '../agents-credential-provider';

describe('AgentsCredentialProvider', () => {
	describe('isFreeAiCreditsCredential', () => {
		const projectId = 'proj-1';
		const user = { id: 'user-1' } as User;

		function providerFor(entities: Array<Partial<CredentialsEntity>>) {
			const credentialsService = mock<CredentialsService>();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				entities as CredentialsEntity[],
			);
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue(
				entities as CredentialsEntity[],
			);
			credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
			return new AgentsCredentialProvider(credentialsService, projectId, user, 'agent-1');
		}

		it('returns true for the managed OpenAI credential', async () => {
			const provider = providerFor([
				{ id: 'cred-1', name: 'n8n free OpenAI API credits', type: 'openAiApi', isManaged: true },
			]);

			await expect(provider.isFreeAiCreditsCredential('cred-1')).resolves.toBe(true);
		});

		it('returns false for a user-owned OpenAI credential', async () => {
			const provider = providerFor([
				{ id: 'cred-1', name: 'My OpenAI key', type: 'openAiApi', isManaged: false },
			]);

			await expect(provider.isFreeAiCreditsCredential('cred-1')).resolves.toBe(false);
		});

		it('returns false for a managed credential of another type', async () => {
			const provider = providerFor([
				{ id: 'cred-1', name: 'managed', type: 'anthropicApi', isManaged: true },
			]);

			await expect(provider.isFreeAiCreditsCredential('cred-1')).resolves.toBe(false);
		});

		it('returns false when the credential is not accessible', async () => {
			const provider = providerFor([]);

			await expect(provider.isFreeAiCreditsCredential('cred-1')).resolves.toBe(false);
		});
	});

	describe('resolveAiGatewayModelCredential', () => {
		const projectId = 'proj-1';
		const user = { id: 'user-1' } as User;

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('mints the gateway synthetic credential for a supported provider', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential.mockResolvedValue({
				apiKey: 'jwt',
				url: 'https://gw/openai/v1',
			});
			Container.set(AiGatewayService, aiGatewayService);

			const provider = new AgentsCredentialProvider(
				mock<CredentialsService>(),
				projectId,
				user,
				'agent-1',
			);
			const result = await provider.resolveAiGatewayModelCredential('openai');

			expect(aiGatewayService.getCredentialTypeForProvider).toHaveBeenCalledWith('openai');
			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'openAiApi',
				userId: 'user-1',
				projectId,
				agentId: 'agent-1',
			});
			expect(result).toEqual({ apiKey: 'jwt', url: 'https://gw/openai/v1' });
		});

		it('throws when the gateway does not serve the provider', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue(undefined);
			Container.set(AiGatewayService, aiGatewayService);

			const provider = new AgentsCredentialProvider(mock<CredentialsService>(), projectId);

			await expect(provider.resolveAiGatewayModelCredential('xai')).rejects.toThrow();
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
		});
	});
});

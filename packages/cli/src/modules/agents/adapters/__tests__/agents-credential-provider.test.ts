import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentsCredentialProvider } from '../agents-credential-provider';

describe('AgentsCredentialProvider', () => {
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

	describe('resolveAiGatewayMcpCredential', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('mints the gateway credential with the agent attribution', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			aiGatewayService.getSyntheticCredential.mockResolvedValue({ token: 'jwt' });
			Container.set(AiGatewayService, aiGatewayService);

			const provider = new AgentsCredentialProvider(
				mock<CredentialsService>(),
				'proj-1',
				{ id: 'user-1' } as User,
				'agent-1',
			);
			const result = await provider.resolveAiGatewayMcpCredential(
				'n8nConnectFirecrawlMcpGatewayApi',
			);

			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'n8nConnectFirecrawlMcpGatewayApi',
				userId: 'user-1',
				projectId: 'proj-1',
				agentId: 'agent-1',
			});
			// `toResolvedCredential` fills the `apiKey` that `ResolvedCredential` requires.
			expect(result).toEqual({ token: 'jwt', apiKey: '' });
		});
	});
});

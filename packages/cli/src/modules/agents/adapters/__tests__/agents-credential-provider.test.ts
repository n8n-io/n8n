import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentsCredentialProvider } from '../agents-credential-provider';

describe('AgentsCredentialProvider', () => {
	describe('list', () => {
		it('lists every credential the user can read in the project', async () => {
			const credentialsService = mock<CredentialsService>();
			const readable = [{ id: 'credential-1', name: 'Header', type: 'httpHeaderAuth' }];
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(readable as never);
			const user = { id: 'user-1' } as User;

			const provider = new AgentsCredentialProvider(credentialsService, 'proj-1', user);

			await expect(provider.list()).resolves.toEqual(readable);
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
				projectId: 'proj-1',
				excludePersonalRoute: true,
				excludeResolvable: true,
			});
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

	describe('resolveAiGatewayMcpCredential', () => {
		it('mints the Gateway credits credential of an MCP registry server for the agent', async () => {
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
				'n8nConnectFirecrawlMcpAiGatewayApi',
			);

			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'n8nConnectFirecrawlMcpAiGatewayApi',
				userId: 'user-1',
				projectId: 'proj-1',
				agentId: 'agent-1',
			});
			// The minted data goes to the MCP client as it is, with no model `apiKey` added.
			expect(result).toEqual({ token: 'jwt' });
		});
	});

	describe('createAiGatewayTokenRefreshFetch', () => {
		const aiGatewayUrl = 'https://gw.example/v1/gateway/openai/v1/responses';
		let aiGatewayService: ReturnType<typeof mock<AiGatewayService>>;
		let baseFetch: ReturnType<typeof vi.fn<typeof fetch>>;
		let provider: AgentsCredentialProvider;

		const sentHeaders = () => new Headers(baseFetch.mock.calls[0][1]?.headers);

		beforeEach(() => {
			aiGatewayService = mock<AiGatewayService>();
			aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
			aiGatewayService.getSyntheticCredential
				.mockResolvedValueOnce({ apiKey: 'jwt-1', url: 'https://gw.example/v1/gateway/openai/v1' })
				.mockResolvedValue({ apiKey: 'jwt-2', url: 'https://gw.example/v1/gateway/openai/v1' });
			Container.set(AiGatewayService, aiGatewayService);
			baseFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response());
			provider = new AgentsCredentialProvider(mock<CredentialsService>(), 'proj-1');
		});

		it('passes requests through when no AI Gateway model credential was minted', async () => {
			const init = { headers: { authorization: 'Bearer jwt-1' } };

			await provider.createAiGatewayTokenRefreshFetch(baseFetch)(aiGatewayUrl, init);

			expect(baseFetch).toHaveBeenCalledWith(aiGatewayUrl, init);
			expect(aiGatewayService.getSyntheticCredential).not.toHaveBeenCalled();
		});

		it.each([
			['authorization', 'Bearer jwt-1', 'Bearer jwt-2'],
			['x-api-key', 'jwt-1', 'jwt-2'],
		])(
			'sets the current token in the %s header of an AI Gateway request',
			async (name, sent, fresh) => {
				await provider.resolveAiGatewayModelCredential('openai');

				await provider.createAiGatewayTokenRefreshFetch(baseFetch)(aiGatewayUrl, {
					headers: { [name]: sent, 'content-type': 'application/json' },
				});

				expect(sentHeaders().get(name)).toBe(fresh);
				expect(sentHeaders().get('content-type')).toBe('application/json');
			},
		);

		it('does not change requests to other origins or with other credentials', async () => {
			await provider.resolveAiGatewayModelCredential('openai');
			const refreshFetch = provider.createAiGatewayTokenRefreshFetch(baseFetch);
			const otherOrigin = { headers: { authorization: 'Bearer jwt-1' } };
			const otherCredential = { headers: { 'x-api-key': 'user-key' } };

			await refreshFetch('https://api.anthropic.com/v1/messages', otherOrigin);
			await refreshFetch(aiGatewayUrl, otherCredential);

			expect(baseFetch).toHaveBeenNthCalledWith(
				1,
				'https://api.anthropic.com/v1/messages',
				otherOrigin,
			);
			expect(baseFetch).toHaveBeenNthCalledWith(2, aiGatewayUrl, otherCredential);
			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledTimes(1);
		});

		it('logs a failed mint and sends the request with its own token', async () => {
			const logger = mock<Logger>();
			Container.set(Logger, logger);
			await provider.resolveAiGatewayModelCredential('openai');
			aiGatewayService.getSyntheticCredential.mockRejectedValue(new Error('config fetch failed'));
			const init = { headers: { authorization: 'Bearer jwt-1' } };

			await provider.createAiGatewayTokenRefreshFetch(baseFetch)(aiGatewayUrl, init);

			expect(baseFetch).toHaveBeenCalledWith(aiGatewayUrl, init);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				error: 'config fetch failed',
			});
		});

		it('replaces the older token of a model config minted before a newer one', async () => {
			await provider.resolveAiGatewayModelCredential('openai');
			await provider.resolveAiGatewayModelCredential('openai');

			await provider.createAiGatewayTokenRefreshFetch(baseFetch)(aiGatewayUrl, {
				headers: { authorization: 'Bearer jwt-1' },
			});

			expect(sentHeaders().get('authorization')).toBe('Bearer jwt-2');
		});

		it('does not treat a refreshed token as a model config token', async () => {
			await provider.resolveAiGatewayModelCredential('openai');
			const refreshFetch = provider.createAiGatewayTokenRefreshFetch(baseFetch);
			const refreshed = { headers: { authorization: 'Bearer jwt-2' } };

			await refreshFetch(aiGatewayUrl, { headers: { authorization: 'Bearer jwt-1' } });
			await refreshFetch(aiGatewayUrl, refreshed);

			expect(baseFetch).toHaveBeenNthCalledWith(2, aiGatewayUrl, refreshed);
			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledTimes(2);
		});
	});
});

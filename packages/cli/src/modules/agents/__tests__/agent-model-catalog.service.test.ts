import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentModelCatalogService } from '../agent-model-catalog.service';
import type { AgentDefaultModelResolverService } from '../agent-default-model-resolver.service';
import type { BuilderModelLiveLookupService } from '../builder/builder-model-live-lookup.service';

const fetchProviderCatalog = vi.fn();
vi.mock('@n8n/agents', () => ({
	fetchProviderCatalog: (...args: unknown[]) => fetchProviderCatalog(...args) as unknown,
}));

const user = mock<User>({ id: 'user-1' });
const credentialId = 'cred-1';

const catalogFixture = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			'claude-sonnet-4-6': {
				id: 'claude-sonnet-4-6',
				name: 'Claude Sonnet 4.6',
				reasoning: true,
				toolCall: true,
				cost: { input: 3, output: 15 },
			},
			'claude-opus-4-0': {
				id: 'claude-opus-4-0',
				name: 'Claude Opus 4',
				reasoning: true,
				toolCall: true,
			},
		},
	},
	google: {
		id: 'google',
		name: 'Google',
		models: {
			'gemini-2.5-flash': {
				id: 'gemini-2.5-flash',
				name: 'Gemini 2.5 Flash',
				reasoning: true,
				toolCall: true,
			},
		},
	},
};

function makeService() {
	const lookupService = mock<BuilderModelLiveLookupService>();
	const defaultModelResolver = mock<AgentDefaultModelResolverService>();
	const logger = mockLogger();
	const service = new AgentModelCatalogService(logger, lookupService, defaultModelResolver);
	return { service, lookupService, defaultModelResolver, logger };
}

describe('AgentModelCatalogService', () => {
	beforeEach(() => {
		fetchProviderCatalog.mockReset();
		fetchProviderCatalog.mockResolvedValue(catalogFixture);
	});

	it('keeps catalog models the provider still reports live, with catalog metadata, and prunes the rest', async () => {
		const { service, lookupService } = makeService();
		// Provider reports Sonnet but not Opus — Opus (retired) must be pruned.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }],
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toHaveLength(1);
		expect(result.models[0]).toMatchObject({
			id: 'claude-sonnet-4-6',
			name: 'Claude Sonnet 4.6',
			cost: { input: 3, output: 15 },
		});
		expect(lookupService.lookup).toHaveBeenCalledWith(
			user,
			'project-1',
			credentialId,
			'anthropicApi',
			'anthropic',
		);
	});

	it('returns the verified default model when the resolver selects one in the response', async () => {
		const { service, lookupService, defaultModelResolver } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }],
		});
		defaultModelResolver.resolveFromVerifiedModelIds.mockReturnValue({
			model: 'anthropic/claude-sonnet-4-6',
			credential: credentialId,
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.defaultModelId).toBe('claude-sonnet-4-6');
	});

	it('verifies against the gateway allowlist for the n8n Connect managed tag', async () => {
		const { service, lookupService } = makeService();
		// Gateway serves only Sonnet — the retired/unsupported Opus must be pruned.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.verified).toBe(true);
		expect(result.models.map((m) => m.id)).toEqual(['claude-sonnet-4-6']);
		expect(lookupService.lookup).toHaveBeenCalledWith(
			user,
			'project-1',
			AI_GATEWAY_MANAGED_TAG,
			'anthropicApi',
			'anthropic',
		);
	});

	it('does not use the static catalog when a managed lookup throws before returning a policy', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockRejectedValue(new Error('gateway unreachable'));

		const result = await service.getProviderModels(
			user,
			'project-1',
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
		);

		// No static-catalog fallback for a managed slot: it would offer models the
		// gateway won't serve. But an outage must not read as "allowlist is empty".
		expect(result).toEqual({
			provider: 'anthropic',
			verified: true,
			unavailable: true,
			models: [],
		});
		expect(fetchProviderCatalog).not.toHaveBeenCalled();
	});

	it('uses the gateway exact (snapshot) id for the managed tag, not the catalog alias', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockResolvedValue({
			anthropic: {
				id: 'anthropic',
				name: 'Anthropic',
				models: {
					'claude-haiku-4-5': {
						id: 'claude-haiku-4-5',
						name: 'Claude Haiku 4.5',
						reasoning: true,
						toolCall: true,
					},
				},
			},
		});
		// The gateway returns the dated snapshot — its allowlist matches this, not the alias.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' }],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.verified).toBe(true);
		// Exact gateway id (callable), catalog display name.
		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }),
		]);
	});

	it('returns the snapshot id as the default when the gateway lists only the dated snapshot', async () => {
		const { service, lookupService, defaultModelResolver } = makeService();
		// The gateway exposes only the dated snapshot of the maintained default;
		// the resolver matches it via its snapshot-stripped alias and returns the
		// callable snapshot id, which must survive the membership check.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6-20251001' }],
		});
		defaultModelResolver.resolveFromVerifiedModelIds.mockReturnValue({
			model: 'anthropic/claude-sonnet-4-6-20251001',
			credential: AI_GATEWAY_MANAGED_TAG,
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(defaultModelResolver.resolveFromVerifiedModelIds).toHaveBeenCalledWith(
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
			['claude-sonnet-4-6-20251001'],
		);
		expect(result.defaultModelId).toBe('claude-sonnet-4-6-20251001');
	});

	it('leaves reasoning support unknown for managed models missing from the catalog', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [{ name: 'Claude Brand New', value: 'claude-brand-new' }],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'anthropic',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-brand-new', name: 'Claude Brand New' }),
		]);
		expect(result.models[0]).not.toHaveProperty('reasoning');
	});

	it('verifies a catalog alias when the provider lists only its dated snapshot', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockResolvedValue({
			anthropic: {
				id: 'anthropic',
				name: 'Anthropic',
				models: {
					// models.dev keeps the versionless alias and drops the snapshot…
					'claude-haiku-4-5': {
						id: 'claude-haiku-4-5',
						name: 'Claude Haiku 4.5',
						reasoning: true,
						toolCall: true,
					},
					'claude-opus-4-0': {
						id: 'claude-opus-4-0',
						name: 'Claude Opus 4',
						reasoning: true,
						toolCall: true,
					},
				},
			},
		});
		// …while Anthropic's API lists the dated snapshot only. The snapshot must
		// verify its alias; the retired alias with no live counterpart stays pruned.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' }],
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models.map((m) => m.id)).toEqual(['claude-haiku-4-5']);
	});

	it('does not add live models that are missing from the catalog', async () => {
		const { service, lookupService } = makeService();
		// Live list includes a model models.dev has no entry for, alongside a known one.
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
				{ name: 'Claude Brand New', value: 'claude-brand-new' },
			],
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		// Only the catalog-known model survives; the live-only one is never added.
		expect(result.models.map((m) => m.id)).toEqual(['claude-sonnet-4-6']);
	});

	it('keeps the gateway label of a google model missing from the catalog', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [{ name: 'Gemini Brand New', value: 'models/gemini-brand-new' }],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'google',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'gemini-brand-new', name: 'Gemini Brand New' }),
		]);
	});

	it('prefers the gateway name over the catalog name and keeps its priority for a managed model', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [
				{ name: 'Gemini 2.5 Flash (Gateway)', value: 'models/gemini-2.5-flash', priority: 10 },
				{ name: 'models/gemini-2.5-flash-lite', value: 'models/gemini-2.5-flash-lite' },
			],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'google',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.models).toEqual([
			expect.objectContaining({
				id: 'gemini-2.5-flash',
				name: 'Gemini 2.5 Flash (Gateway)',
				reasoning: true,
				priority: 10,
			}),
			expect.objectContaining({ id: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite' }),
		]);
	});

	it('falls back to the catalog name or the id when the gateway reports no name', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'managed',
			models: [
				{ name: '', value: 'models/gemini-2.5-flash' },
				{ name: '', value: 'models/gemini-brand-new', priority: 5 },
			],
		});

		const result = await service.getProviderModels(
			user,
			'project-1',
			'google',
			AI_GATEWAY_MANAGED_TAG,
		);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }),
			{ id: 'gemini-brand-new', name: 'gemini-brand-new', toolCall: true, priority: 5 },
		]);
	});

	it('strips the "models/" prefix from google model ids before matching', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [{ name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' }],
		});

		const result = await service.getProviderModels(user, 'project-1', 'google', credentialId);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }),
		]);
	});

	it('falls back to the catalog list (verified: false) when the live lookup fails', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockRejectedValue(new Error('provider is down'));

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models.map((m) => m.id).sort()).toEqual(['claude-opus-4-0', 'claude-sonnet-4-6']);
	});

	it('uses only exact live models for a custom OpenAI-compatible endpoint', async () => {
		const { service, lookupService } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'endpoint-only',
			models: [
				{ name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
				{ name: 'GLM 4.5', value: 'glm-4.5' },
				{ name: '', value: 'qwen3-coder' },
			],
		});

		const result = await service.getProviderModels(user, 'project-1', 'openai', credentialId);

		expect(result).toEqual({
			provider: 'openai',
			verified: true,
			models: [
				{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', toolCall: true },
				{ id: 'glm-4.5', name: 'GLM 4.5', toolCall: true },
				{ id: 'qwen3-coder', name: 'qwen3-coder', toolCall: true },
			],
		});
		expect(fetchProviderCatalog).not.toHaveBeenCalled();
	});

	it('returns the default model when a custom endpoint exposes it', async () => {
		const { service, lookupService, defaultModelResolver } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'endpoint-only',
			models: [
				{ name: 'GLM 4.5', value: 'glm-4.5' },
				{ name: 'GPT-5 mini', value: 'gpt-5-mini' },
			],
		});
		defaultModelResolver.resolveFromVerifiedModelIds.mockReturnValue({
			model: 'openai/gpt-5-mini',
			credential: credentialId,
		});

		const result = await service.getProviderModels(user, 'project-1', 'openai', credentialId);

		expect(defaultModelResolver.resolveFromVerifiedModelIds).toHaveBeenCalledWith(
			'openai',
			credentialId,
			['glm-4.5', 'gpt-5-mini'],
		);
		expect(result.defaultModelId).toBe('gpt-5-mini');
	});

	it('reports a custom OpenAI-compatible endpoint as unavailable without catalog fallback', async () => {
		const { service, lookupService, logger } = makeService();
		lookupService.lookup.mockResolvedValue({
			status: 'unavailable',
			policy: 'endpoint-only',
			error: new Error('endpoint unavailable'),
		});

		const result = await service.getProviderModels(user, 'project-1', 'openai', credentialId);

		expect(result).toEqual({
			provider: 'openai',
			verified: true,
			unavailable: true,
			models: [],
		});
		expect(fetchProviderCatalog).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Live model list failed'),
			expect.objectContaining({ provider: 'openai', error: 'endpoint unavailable' }),
		);
	});

	it('falls back to the catalog list (verified: false) when no credential is provided', async () => {
		const { service, lookupService } = makeService();

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', undefined);

		expect(result.verified).toBe(false);
		expect(result.models).toHaveLength(2);
		expect(lookupService.lookup).not.toHaveBeenCalled();
	});

	it('falls back to the catalog list for providers without a live lookup', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockResolvedValue({
			'aws-bedrock': {
				id: 'aws-bedrock',
				name: 'AWS Bedrock',
				models: {
					'anthropic.claude-sonnet-4-6-v1:0': {
						id: 'anthropic.claude-sonnet-4-6-v1:0',
						name: 'Claude Sonnet 4.6',
						reasoning: true,
						toolCall: true,
					},
				},
			},
		});

		const result = await service.getProviderModels(user, 'project-1', 'aws-bedrock', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models).toHaveLength(1);
		expect(lookupService.lookup).not.toHaveBeenCalled();
	});

	describe('azure-openai Foundry deployments', () => {
		const azureCatalog = {
			'azure-openai': {
				id: 'azure-openai',
				name: 'Azure OpenAI',
				models: {
					'gpt-4.1': { id: 'gpt-4.1', name: 'GPT-4.1', toolCall: true },
				},
			},
		};

		it('returns a Foundry credential deployments as exact, verified models', async () => {
			const { service, lookupService } = makeService();
			lookupService.lookup.mockResolvedValue({
				status: 'success',
				policy: 'endpoint-only',
				models: [
					{ name: 'my-chat (gpt-4.1)', value: 'my-chat' },
					{ name: 'my-other (gpt-4.1-mini)', value: 'my-other' },
				],
			});

			const result = await service.getProviderModels(
				user,
				'project-1',
				'azure-openai',
				credentialId,
			);

			expect(result).toEqual({
				provider: 'azure-openai',
				verified: true,
				models: [
					{ id: 'my-chat', name: 'my-chat (gpt-4.1)', toolCall: true },
					{ id: 'my-other', name: 'my-other (gpt-4.1-mini)', toolCall: true },
				],
			});
			expect(lookupService.lookup).toHaveBeenCalledWith(
				user,
				'project-1',
				credentialId,
				'azureOpenAiApi',
				'azure-openai',
			);
			// The live deployment list is authoritative; the catalog is not consulted.
			expect(fetchProviderCatalog).not.toHaveBeenCalled();
		});

		it('falls back to the catalog list when the credential cannot list deployments', async () => {
			const { service, lookupService, logger } = makeService();
			fetchProviderCatalog.mockResolvedValue(azureCatalog);
			// A classic credential, or a Foundry credential without a project.
			lookupService.lookup.mockRejectedValue(
				new UserError('The credential has no Microsoft Foundry project set'),
			);

			const result = await service.getProviderModels(
				user,
				'project-1',
				'azure-openai',
				credentialId,
			);

			expect(result.verified).toBe(false);
			expect(result.models.map((m) => m.id)).toEqual(['gpt-4.1']);
			// An expected picker state is logged quietly, not as a warn.
			expect(logger.warn).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Live model list failed',
				expect.objectContaining({ provider: 'azure-openai' }),
			);
		});

		it('reports an unavailable deployments list without catalog fallback', async () => {
			const { service, lookupService } = makeService();
			lookupService.lookup.mockResolvedValue({
				status: 'unavailable',
				policy: 'endpoint-only',
				error: new Error('Project "missing" was not found'),
			});

			const result = await service.getProviderModels(
				user,
				'project-1',
				'azure-openai',
				credentialId,
			);

			expect(result).toEqual({
				provider: 'azure-openai',
				verified: true,
				unavailable: true,
				models: [],
			});
			expect(fetchProviderCatalog).not.toHaveBeenCalled();
		});

		it('keeps the static catalog for the n8n Connect managed tag', async () => {
			const { service, lookupService } = makeService();
			fetchProviderCatalog.mockResolvedValue(azureCatalog);

			const result = await service.getProviderModels(
				user,
				'project-1',
				'azure-openai',
				AI_GATEWAY_MANAGED_TAG,
			);

			// The managed gateway serves its own model ids, not the user's
			// deployments, so its list is not fetched live.
			expect(result.verified).toBe(false);
			expect(result.models.map((m) => m.id)).toEqual(['gpt-4.1']);
			expect(lookupService.lookup).not.toHaveBeenCalled();
		});
	});

	it('still returns live models (verified: true) when the catalog fetch fails', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockRejectedValue(new Error('models.dev unreachable'));
		lookupService.lookup.mockResolvedValue({
			status: 'success',
			policy: 'curated',
			models: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }],
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' }),
		]);
		expect(result.models[0]).not.toHaveProperty('reasoning');
	});

	it('returns an empty unverified list when both the lookup and the catalog fail', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockRejectedValue(new Error('models.dev unreachable'));
		lookupService.lookup.mockResolvedValue({
			status: 'unavailable',
			policy: 'curated',
			error: new Error('provider is down'),
		});

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models).toEqual([]);
	});
});

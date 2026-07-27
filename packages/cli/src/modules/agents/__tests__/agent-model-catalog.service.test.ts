import type { User } from '@n8n/db';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { AgentModelCatalogService } from '../agent-model-catalog.service';
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
	const service = new AgentModelCatalogService(mockLogger(), lookupService);
	return { service, lookupService };
}

describe('AgentModelCatalogService', () => {
	beforeEach(() => {
		fetchProviderCatalog.mockReset();
		fetchProviderCatalog.mockResolvedValue(catalogFixture);
	});

	it('keeps catalog models the provider still reports live, with catalog metadata, and prunes the rest', async () => {
		const { service, lookupService } = makeService();
		// Provider reports Sonnet but not Opus — Opus (retired) must be pruned.
		lookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
		]);

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toHaveLength(1);
		expect(result.models[0]).toMatchObject({
			id: 'claude-sonnet-4-6',
			name: 'Claude Sonnet 4.6',
			cost: { input: 3, output: 15 },
		});
		expect(lookupService.list).toHaveBeenCalledWith(
			user,
			'project-1',
			credentialId,
			'anthropicApi',
			'anthropic',
		);
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
		lookupService.list.mockResolvedValue([
			{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
		]);

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models.map((m) => m.id)).toEqual(['claude-haiku-4-5']);
	});

	it('does not add live models that are missing from the catalog', async () => {
		const { service, lookupService } = makeService();
		// Live list includes a model models.dev has no entry for, alongside a known one.
		lookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
			{ name: 'Claude Brand New', value: 'claude-brand-new' },
		]);

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		// Only the catalog-known model survives; the live-only one is never added.
		expect(result.models.map((m) => m.id)).toEqual(['claude-sonnet-4-6']);
	});

	it('strips the "models/" prefix from google model ids before matching', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockResolvedValue([
			{ name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' },
		]);

		const result = await service.getProviderModels(user, 'project-1', 'google', credentialId);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }),
		]);
	});

	it('falls back to the catalog list (verified: false) when the live lookup fails', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockRejectedValue(new Error('provider is down'));

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models.map((m) => m.id).sort()).toEqual(['claude-opus-4-0', 'claude-sonnet-4-6']);
	});

	it('falls back to the catalog list (verified: false) when no credential is provided', async () => {
		const { service, lookupService } = makeService();

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', undefined);

		expect(result.verified).toBe(false);
		expect(result.models).toHaveLength(2);
		expect(lookupService.list).not.toHaveBeenCalled();
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
		expect(lookupService.list).not.toHaveBeenCalled();
	});

	it('still returns live models (verified: true) when the catalog fetch fails', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockRejectedValue(new Error('models.dev unreachable'));
		lookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
		]);

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' }),
		]);
	});

	it('returns an empty unverified list when both the lookup and the catalog fail', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockRejectedValue(new Error('models.dev unreachable'));
		lookupService.list.mockRejectedValue(new Error('provider is down'));

		const result = await service.getProviderModels(user, 'project-1', 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models).toEqual([]);
	});
});

import type { User } from '@n8n/db';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { AgentModelCatalogService } from '../agent-model-catalog.service';
import type { BuilderModelLookupService } from '../builder/builder-model-lookup.service';

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
	const lookupService = mock<BuilderModelLookupService>();
	const service = new AgentModelCatalogService(mockLogger(), lookupService);
	return { service, lookupService };
}

describe('AgentModelCatalogService', () => {
	beforeEach(() => {
		fetchProviderCatalog.mockReset();
		fetchProviderCatalog.mockResolvedValue(catalogFixture);
	});

	it('returns only the models the provider reports live, enriched with catalog metadata', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
		]);

		const result = await service.getProviderModels(user, 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toHaveLength(1);
		expect(result.models[0]).toMatchObject({
			id: 'claude-sonnet-4-6',
			name: 'Claude Sonnet 4.6',
			cost: { input: 3, output: 15 },
		});
		expect(lookupService.list).toHaveBeenCalledWith(
			user,
			credentialId,
			'anthropicApi',
			expect.objectContaining({ kind: 'listSearch' }),
		);
	});

	it('keeps live models missing from the catalog, defaulting tool support to true', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockResolvedValue([{ name: 'Claude Brand New', value: 'claude-brand-new' }]);

		const result = await service.getProviderModels(user, 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-brand-new', name: 'Claude Brand New', toolCall: true }),
		]);
	});

	it('strips the "models/" prefix from google model ids before matching', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockResolvedValue([
			{ name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' },
		]);

		const result = await service.getProviderModels(user, 'google', credentialId);

		expect(result.models).toEqual([
			expect.objectContaining({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }),
		]);
	});

	it('falls back to the catalog list (verified: false) when the live lookup fails', async () => {
		const { service, lookupService } = makeService();
		lookupService.list.mockRejectedValue(new Error('provider is down'));

		const result = await service.getProviderModels(user, 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models.map((m) => m.id).sort()).toEqual(['claude-opus-4-0', 'claude-sonnet-4-6']);
	});

	it('falls back to the catalog list (verified: false) when no credential is provided', async () => {
		const { service, lookupService } = makeService();

		const result = await service.getProviderModels(user, 'anthropic', undefined);

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

		const result = await service.getProviderModels(user, 'aws-bedrock', credentialId);

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

		const result = await service.getProviderModels(user, 'anthropic', credentialId);

		expect(result.verified).toBe(true);
		expect(result.models).toEqual([
			expect.objectContaining({ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' }),
		]);
	});

	it('returns an empty unverified list when both the lookup and the catalog fail', async () => {
		const { service, lookupService } = makeService();
		fetchProviderCatalog.mockRejectedValue(new Error('models.dev unreachable'));
		lookupService.list.mockRejectedValue(new Error('provider is down'));

		const result = await service.getProviderModels(user, 'anthropic', credentialId);

		expect(result.verified).toBe(false);
		expect(result.models).toEqual([]);
	});
});

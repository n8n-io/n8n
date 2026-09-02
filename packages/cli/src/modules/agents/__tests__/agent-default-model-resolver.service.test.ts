import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentDefaultModelResolverService } from '../agent-default-model-resolver.service';
import type { BuilderModelLiveLookupService } from '../builder/builder-model-live-lookup.service';

const user = { id: 'user-1' } as never;

function makeService(credentials: Array<{ id: string; name: string; type: string }> = []) {
	const credentialsService = mock<CredentialsService>();
	const modelLookupService = mock<BuilderModelLiveLookupService>();
	const aiGatewayService = mock<AiGatewayService>();
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(credentials as never);

	return {
		service: new AgentDefaultModelResolverService(
			credentialsService,
			modelLookupService,
			aiGatewayService,
		),
		modelLookupService,
		aiGatewayService,
	};
}

describe('AgentDefaultModelResolverService', () => {
	it('uses a provider default only when live discovery confirms it', async () => {
		const { service, modelLookupService } = makeService([
			{ id: 'anthropic-credential', name: 'Anthropic', type: 'anthropicApi' },
		]);
		modelLookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
		]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'anthropic/claude-sonnet-5',
			credential: 'anthropic-credential',
		});
	});

	it('resolves creation to the dated snapshot when the live list has only that form', async () => {
		const { service, modelLookupService } = makeService([
			{ id: 'anthropic-credential', name: 'Anthropic', type: 'anthropicApi' },
		]);
		modelLookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 5', value: 'claude-sonnet-5-20260630' },
		]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'anthropic/claude-sonnet-5-20260630',
			credential: 'anthropic-credential',
		});
	});

	it('leaves a credential unresolved when its default is not live', async () => {
		const { service, modelLookupService } = makeService([
			{ id: 'anthropic-credential', name: 'Anthropic', type: 'anthropicApi' },
		]);
		modelLookupService.list.mockResolvedValue([{ name: 'Claude Opus', value: 'claude-opus-4-6' }]);

		await expect(service.resolve(user, 'project-1')).resolves.toBeNull();
	});

	it('uses the managed OpenAI fallback only when the gateway allows it', async () => {
		const { service, modelLookupService, aiGatewayService } = makeService();
		aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
		modelLookupService.list.mockResolvedValue([{ name: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' }]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'openai/gpt-5.6-terra',
			credential: AI_GATEWAY_MANAGED_TAG,
		});
	});

	it('resolves to null instead of throwing when the gateway config lookup fails', async () => {
		const { service, aiGatewayService } = makeService();
		aiGatewayService.getCredentialTypeForProvider.mockRejectedValue(
			new Error('Gateway credits config fetch recently failed; retry is throttled.'),
		);

		await expect(service.resolve(user, 'project-1')).resolves.toBeNull();
	});

	it('resolveFromVerifiedModelIds returns the default when it is in the verified list', () => {
		const { service } = makeService();

		expect(
			service.resolveFromVerifiedModelIds('anthropic', 'anthropic-credential', [
				'claude-opus-4-6',
				'claude-sonnet-5',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5',
			credential: 'anthropic-credential',
		});
	});

	it('resolveFromVerifiedModelIds resolves a snapshot-only list to the verified snapshot id', () => {
		const { service } = makeService();

		// The managed gateway may list only the dated snapshot of the maintained
		// default — the snapshot is the only callable id there, so it is returned.
		expect(
			service.resolveFromVerifiedModelIds('anthropic', 'anthropic-credential', [
				'claude-opus-4-6',
				'claude-sonnet-5-20260630',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5-20260630',
			credential: 'anthropic-credential',
		});
	});

	it('resolveFromVerifiedModelIds prefers the exact default over a snapshot of it', () => {
		const { service } = makeService();

		expect(
			service.resolveFromVerifiedModelIds('anthropic', 'anthropic-credential', [
				'claude-sonnet-5-20260630',
				'claude-sonnet-5',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5',
			credential: 'anthropic-credential',
		});
	});

	it('resolveFromVerifiedModelIds returns null when the default is not in the verified list', () => {
		const { service } = makeService();

		expect(
			service.resolveFromVerifiedModelIds('anthropic', 'anthropic-credential', ['claude-opus-4-6']),
		).toBeNull();
	});

	it('resolveFromVerifiedModelIds returns null for an unknown provider', () => {
		const { service } = makeService();

		expect(
			service.resolveFromVerifiedModelIds('unknown-provider', 'credential-1', ['any-model']),
		).toBeNull();
	});
});

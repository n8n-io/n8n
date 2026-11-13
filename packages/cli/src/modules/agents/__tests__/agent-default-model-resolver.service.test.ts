import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import { AgentDefaultModelResolverService } from '../agent-default-model-resolver.service';
import type { BuilderModelLiveLookupService } from '../builder/builder-model-live-lookup.service';
import { LLM_PROVIDER_DEFAULTS } from '../llm-provider-defaults';

const user = { id: 'user-1' } as never;

type TestCredential = { id: string; name: string; type: string };

function makeService(credentials: TestCredential[] = [], inaccessibleIds: string[] = []) {
	const credentialsService = mock<CredentialsService>();
	const modelLookupService = mock<BuilderModelLiveLookupService>();
	const aiGatewayService = mock<AiGatewayService>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(credentials as never);
	credentialsPermissionChecker.filterUsableThroughOwnAccess.mockImplementation(async (_user, all) =>
		all.filter((c) => !inaccessibleIds.includes(c.id)),
	);

	return {
		service: new AgentDefaultModelResolverService(
			credentialsService,
			modelLookupService,
			aiGatewayService,
			credentialsPermissionChecker,
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
			{ name: 'Claude Sonnet 5.5', value: 'claude-sonnet-5-5' },
		]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'anthropic/claude-sonnet-5-5',
			credential: 'anthropic-credential',
		});
	});

	it("never picks another user's personal credential as the default", async () => {
		const own = { id: 'own', name: 'My OpenAI', type: 'openAiApi' };
		const colleague = { id: 'colleague', name: 'Their Anthropic', type: 'anthropicApi' };
		const { service, modelLookupService } = makeService([own, colleague], [colleague.id]);
		// Keep this access check independent of model updates.
		const defaultModel = LLM_PROVIDER_DEFAULTS.openAiApi.defaultModel as string;
		modelLookupService.list.mockResolvedValue([{ name: defaultModel, value: defaultModel }]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: `openai/${defaultModel}`,
			credential: 'own',
		});
		expect(modelLookupService.list).toHaveBeenCalledExactlyOnceWith(
			user,
			'project-1',
			own.id,
			own.type,
			'openai',
		);
	});

	it('resolves creation to the dated snapshot when the live list has only that form', async () => {
		const { service, modelLookupService } = makeService([
			{ id: 'anthropic-credential', name: 'Anthropic', type: 'anthropicApi' },
		]);
		modelLookupService.list.mockResolvedValue([
			{ name: 'Claude Sonnet 5.5', value: 'claude-sonnet-5-5-20260928' },
		]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'anthropic/claude-sonnet-5-5-20260928',
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
		modelLookupService.list.mockResolvedValue([{ name: 'GPT-6.1 Terra', value: 'gpt-6.1-terra' }]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'openai/gpt-6.1-terra',
			credential: AI_GATEWAY_MANAGED_TAG,
		});
	});

	it('never makes a Foundry deployment the default, and keeps the managed fallback', async () => {
		const { service, modelLookupService, aiGatewayService } = makeService([
			{ id: 'f1', name: 'My Foundry', type: 'azureOpenAiApi' },
		]);
		aiGatewayService.getCredentialTypeForProvider.mockResolvedValue('openAiApi');
		modelLookupService.list.mockResolvedValue([{ name: 'GPT-6.1 Terra', value: 'gpt-6.1-terra' }]);

		await expect(service.resolve(user, 'project-1')).resolves.toEqual({
			model: 'openai/gpt-6.1-terra',
			credential: AI_GATEWAY_MANAGED_TAG,
		});
		expect(modelLookupService.list).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'f1',
			expect.anything(),
			expect.anything(),
		);
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
				'claude-sonnet-5-5',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5-5',
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
				'claude-sonnet-5-5-20260928',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5-5-20260928',
			credential: 'anthropic-credential',
		});
	});

	it('resolveFromVerifiedModelIds prefers the exact default over a snapshot of it', () => {
		const { service } = makeService();

		expect(
			service.resolveFromVerifiedModelIds('anthropic', 'anthropic-credential', [
				'claude-sonnet-5-5-20260928',
				'claude-sonnet-5-5',
			]),
		).toEqual({
			model: 'anthropic/claude-sonnet-5-5',
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

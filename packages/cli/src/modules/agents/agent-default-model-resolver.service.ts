import type { CredentialListItem } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { isModelDiscoveryProvider } from '@n8n/ai-utilities/model-discovery';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { BuilderModelLiveLookupService } from './builder/builder-model-live-lookup.service';
import { LLM_PROVIDER_DEFAULTS, LLM_PROVIDER_PRIORITY } from './llm-provider-defaults';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { stripSnapshotSuffix } from './utils/model-snapshot-alias';

export interface ResolvedAgentDefaultModel {
	model: string;
	credential: string;
}

/**
 * Resolves a sensible default model+credential for a new agent, and answers
 * "is the maintained default still in this provider's verified model list?"
 *
 * The creation path ({@link resolve}) does its own live discovery — it has no
 * verified list yet. The catalog path ({@link resolveFromVerifiedModelIds})
 * is pure: the caller already fetched the live list, so this must not repeat
 * that network call.
 */
@Service()
export class AgentDefaultModelResolverService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly modelLookupService: BuilderModelLiveLookupService,
		private readonly aiGatewayService: AiGatewayService,
	) {}

	/**
	 * Full resolution for agent creation: lists credentials, picks the
	 * highest-priority provider with exactly one credential, and verifies
	 * its maintained default against the provider's live model list. Falls
	 * back to the n8n Connect managed OpenAI slot when the user has no
	 * personal LLM credential. Returns `null` when the choice is ambiguous
	 * or the default is not live — the caller keeps the agent as a draft.
	 */
	async resolve(user: User, projectId: string): Promise<ResolvedAgentDefaultModel | null> {
		const credentials = await createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		).list();
		const supportedCredentials = credentials.filter((credential) =>
			Object.hasOwn(LLM_PROVIDER_DEFAULTS, credential.type),
		);

		if (supportedCredentials.length === 0) {
			return await this.resolveManagedOpenAi(user, projectId);
		}

		const credentialsByProvider = new Map<string, CredentialListItem[]>();
		for (const credential of supportedCredentials) {
			const provider = LLM_PROVIDER_DEFAULTS[credential.type].provider;
			credentialsByProvider.set(provider, [
				...(credentialsByProvider.get(provider) ?? []),
				credential,
			]);
		}

		const provider = LLM_PROVIDER_PRIORITY.find(
			(candidate) => credentialsByProvider.get(candidate)?.length === 1,
		);
		if (!provider) return null;

		return await this.resolveCredential(user, projectId, credentialsByProvider.get(provider)?.[0]);
	}

	/**
	 * Pure counterpart for the model-catalog path. The caller has already
	 * fetched and verified the provider's model list (e.g. via
	 * `BuilderModelLiveLookupService`); this just checks whether the
	 * maintained default for the provider is in that list, without any
	 * additional I/O.
	 */
	resolveFromVerifiedModelIds(
		provider: string,
		credentialId: string,
		verifiedModelIds: readonly string[],
	): ResolvedAgentDefaultModel | null {
		const defaults = this.findProviderDefault(provider);
		if (!defaults) return null;

		const lowerDefault = defaults.defaultModel.toLowerCase();
		// Exact match first; otherwise a verified id whose snapshot-stripped alias
		// is the default — the managed gateway may list only the dated snapshot
		// (e.g. `claude-sonnet-4-6-20251001`), and only that exact id is callable
		// there. Return the verified id (original casing) so callers can use it
		// verbatim against the verified list.
		const match =
			verifiedModelIds.find((id) => id.toLowerCase() === lowerDefault) ??
			verifiedModelIds.find((id) => stripSnapshotSuffix(id).toLowerCase() === lowerDefault);
		return match ? { model: `${provider}/${match}`, credential: credentialId } : null;
	}

	private findProviderDefault(
		provider: string,
	): { provider: string; defaultModel: string; credentialType: string } | undefined {
		const entry = Object.entries(LLM_PROVIDER_DEFAULTS).find(
			([, defaults]) => defaults.provider === provider,
		);
		return entry
			? {
					provider: entry[1].provider,
					defaultModel: entry[1].defaultModel,
					credentialType: entry[0],
				}
			: undefined;
	}

	private async resolveManagedOpenAi(
		user: User,
		projectId: string,
	): Promise<ResolvedAgentDefaultModel | null> {
		const defaults = LLM_PROVIDER_DEFAULTS.openAiApi;
		let credentialType: string | undefined;
		try {
			credentialType = await this.aiGatewayService.getCredentialTypeForProvider(defaults.provider);
		} catch {
			// Gateway config fetch can fail transiently (and is failure-throttled).
			// Resolution is best-effort: creation proceeds without a default.
			return null;
		}
		if (credentialType !== 'openAiApi') return null;

		return await this.resolveCredential(user, projectId, {
			id: AI_GATEWAY_MANAGED_TAG,
			name: 'Gateway credits',
			type: credentialType,
		});
	}

	private async resolveCredential(
		user: User,
		projectId: string,
		credential: CredentialListItem | undefined,
	): Promise<ResolvedAgentDefaultModel | null> {
		if (!credential) return null;

		const defaults = LLM_PROVIDER_DEFAULTS[credential.type];
		if (!defaults) return null;

		if (!isModelDiscoveryProvider(defaults.provider)) {
			return { model: `${defaults.provider}/${defaults.defaultModel}`, credential: credential.id };
		}

		try {
			const availableModels = await this.modelLookupService.list(
				user,
				projectId,
				credential.id,
				credential.type,
				defaults.provider,
			);
			return this.resolveFromVerifiedModelIds(
				defaults.provider,
				credential.id,
				availableModels.map(({ value }) => value),
			);
		} catch {
			return null;
		}
	}
}

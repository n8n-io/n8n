import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { mapCredentialForProvider } from '../json-config/credential-field-mapping';

/**
 * Fetches a provider's live chat-model list for a credential, via the shared
 * `@n8n/ai-utilities/model-discovery` functions (the same provider knowledge
 * that backs the chat sub-nodes' model dropdowns). Nothing from
 * `@n8n/n8n-nodes-langchain` is loaded on this path.
 *
 * The credential must be usable by the user within the given project — the
 * same set as the workflow editor's credential picker.
 */
@Service()
export class BuilderModelLiveLookupService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/**
	 * Returns `{ name, value }` pairs (value = the provider's model id, exactly
	 * as the provider API expects it). Throws if the credential is not usable by
	 * the user in the project, its type doesn't match, or the provider has no
	 * model discovery support.
	 */
	async list(
		user: User,
		projectId: string,
		credentialId: string,
		credentialType: string,
		provider: string,
	): Promise<Array<{ name: string; value: string }>> {
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId },
		);
		const usable = usableCredentials.find((c) => c.id === credentialId);
		if (!usable || usable.type !== credentialType) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}

		const credential = await this.credentialsFinderService.findCredentialById(credentialId);
		if (!credential) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}
		const rawData = await this.credentialsService.decrypt(credential, true);

		const { listModelsForProvider } = await import('@n8n/ai-utilities/model-discovery');
		const mapped = mapCredentialForProvider(provider, { apiKey: '', ...rawData });
		const apiKey = typeof mapped.apiKey === 'string' ? mapped.apiKey : '';
		const baseURL =
			typeof mapped.baseURL === 'string' && mapped.baseURL ? mapped.baseURL : undefined;

		const models = await listModelsForProvider(provider, {
			apiKey,
			baseURL,
			fetch: createAiProxyFetch(this.outboundHttp) as typeof globalThis.fetch,
		});

		// Every supported chat provider offers models, so an empty list means a
		// broken request or a drifted response shape, not a zero-model account.
		// Throw so callers fall back (unverified catalog / lookup-failed) instead
		// of treating "nothing" as a verified answer and pruning every model.
		if (models.length === 0) {
			throw new Error(`Provider ${provider} returned no models`);
		}

		return models.map((model) => ({ name: model.name, value: model.id }));
	}
}

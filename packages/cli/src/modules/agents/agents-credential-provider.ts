import type { CredentialProvider, ResolvedCredential, CredentialListItem } from '@n8n/agents';
import type { User } from '@n8n/db';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

/**
 * Credential types supported by the agent framework as LLM providers.
 * These map to n8n credential type identifiers.
 */
const SUPPORTED_CREDENTIAL_TYPES = [
	'anthropicApi',
	'openAiApi',
	'googlePalmApi',
	'xAiApi',
	'groqApi',
	'deepSeekApi',
	'mistralCloudApi',
	'openRouterApi',
	'cohereApi',
	'ollamaApi',
];

/**
 * Resolves and lists n8n credentials for use by SDK agents.
 *
 * This is not a DI-managed singleton — a new instance is created per request
 * because it is scoped to a specific user.
 */
export class AgentsCredentialProvider implements CredentialProvider {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly user: User,
	) {}

	/**
	 * Resolve a credential by ID or name: verify user access, decrypt, and return
	 * the raw credential data (including apiKey).
	 *
	 * First tries to find by ID. If that fails, searches by name among the user's
	 * accessible credentials. This allows agent code to use either:
	 *   .credential('credential-id-here')
	 *   .credential('Anthropic account')
	 */
	async resolve(credentialIdOrName: string): Promise<ResolvedCredential> {
		// Try by ID first
		let credential = await this.credentialsFinderService.findCredentialForUser(
			credentialIdOrName,
			this.user,
			['credential:read'],
		);

		// If not found by ID, try by name
		if (!credential) {
			const allCredentials = await this.credentialsFinderService.findCredentialsForUser(this.user, [
				'credential:read',
			]);
			credential =
				allCredentials.find((c) => c.name.toLowerCase() === credentialIdOrName.toLowerCase()) ??
				null;
		}

		if (!credential) {
			throw new Error(`Credential "${credentialIdOrName}" not found or not accessible`);
		}

		const data = this.credentialsService.decrypt(credential, true);
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';

		return { apiKey, ...data };
	}

	/**
	 * List credentials the user can access, filtered to supported LLM provider types.
	 */
	async list(): Promise<CredentialListItem[]> {
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(this.user, [
			'credential:read',
		]);

		return allCredentials
			.filter((c) => SUPPORTED_CREDENTIAL_TYPES.includes(c.type))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			}));
	}
}

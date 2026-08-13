import type { CredentialProvider, ResolvedCredential, CredentialListItem } from '@n8n/agents';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AiGatewayService } from '@/services/ai-gateway.service';

import type { AiGatewayModelCredentialResolver } from '../json-config/model-config';

function toResolvedCredential(data: unknown): ResolvedCredential {
	const resolved = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const apiKey = 'apiKey' in resolved && typeof resolved.apiKey === 'string' ? resolved.apiKey : '';

	return { ...resolved, apiKey };
}

/**
 * Resolves and lists n8n credentials for use by SDK agents.
 *
 * This is not a DI-managed singleton — a new instance is created per request,
 * scoped to a specific project. When a request user is provided, list/resolve
 * follows the same credential set as the workflow editor for that project.
 * Published runtime execution can omit the user and stays project-scoped.
 */
export class AgentsCredentialProvider
	implements CredentialProvider, AiGatewayModelCredentialResolver
{
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly projectId: string,
		private readonly user?: User,
	) {}

	/**
	 * Mint the n8n Connect (AI Gateway) synthetic credential for a model slot
	 * marked with `AI_GATEWAY_MANAGED_TAG`, keyed by the model's provider prefix
	 * (e.g. `openai`). The provider → credential-type mapping and support check
	 * live in `AiGatewayService`, resolved lazily so no gateway wiring leaks into
	 * this provider's construction sites.
	 */
	async resolveAiGatewayModelCredential(provider: string): Promise<ResolvedCredential> {
		const aiGatewayService = Container.get(AiGatewayService);
		const credentialType = await aiGatewayService.getCredentialTypeForProvider(provider);
		if (!credentialType) {
			throw new UserError(`n8n credits does not support the "${provider}" model provider.`);
		}
		return await aiGatewayService.getSyntheticCredential({
			credentialType,
			userId: this.user?.id,
			projectId: this.projectId,
		});
	}

	/**
	 * Resolve a credential by ID, then decrypt and return the usable data.
	 *
	 * Only credentials visible to this provider's scope are considered — the
	 * same user-scoped intersection as `list()` when a request user is set, so
	 * a user can never decrypt a credential they wouldn't see listed.
	 */
	async resolve(credentialId: string): Promise<ResolvedCredential> {
		const credential = await this.findCredentialEntity(credentialId);

		if (!credential) {
			throw new Error(`Credential "${credentialId}" not found or not accessible`);
		}

		const data = await this.decryptWithExpressions(credential);
		return toResolvedCredential(data);
	}

	/**
	 * Decrypt through `CredentialsHelper.getDecrypted` — the same path node
	 * execution takes — so credential fields holding expressions are evaluated
	 * rather than handed to the caller as raw `={{ ... }}` strings. Without
	 * this, a field backed by an external secret (`{{ $secrets.store.key }}`)
	 * reaches the MCP client / model provider verbatim and auth fails.
	 *
	 * The agents runtime has no workflow or execution, so `additionalData` is
	 * built from `getBase()` and scoped to this provider's project — that is
	 * what carries the external secrets proxy and project variables. `internal`
	 * mode keeps dynamic (per-user resolvable) credentials out of scope; those
	 * need an execution context that agents don't have.
	 */
	private async decryptWithExpressions(
		credential: CredentialsEntity,
	): Promise<ICredentialDataDecryptedObject> {
		// Imported lazily: `workflow-execute-additional-data` reaches back into
		// this module to run agents from workflows.
		// eslint-disable-next-line import-x/no-cycle
		const { getBase } = await import('@/workflow-execute-additional-data.js');
		const additionalData = await getBase({
			userId: this.user?.id,
			projectId: this.projectId,
		});

		return await Container.get(CredentialsHelper).getDecrypted(
			additionalData,
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
		);
	}

	/**
	 * List all credentials available in this provider's scope.
	 */
	async list(): Promise<CredentialListItem[]> {
		if (this.user) {
			const accessible = await this.getUserAccessibleCredentials();

			return accessible.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			}));
		}

		// this fetches all credentials accessible to the project
		const accessible = await this.getAllProjectAndGlobalCredentials();

		return accessible.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}

	private async findCredentialEntity(credentialId: string): Promise<CredentialsEntity | null> {
		if (this.user) {
			// Same user-scoped intersection as list() — a credential the project
			// or global scope allows but this user can't see must not resolve.
			const userAccessible = await this.getUserAccessibleCredentials();
			if (!userAccessible.some((c) => c.id === credentialId)) return null;
		}

		const accessible = await this.getAllProjectAndGlobalCredentials();
		return accessible.find((c) => c.id === credentialId) ?? null;
	}

	private async getUserAccessibleCredentials() {
		if (!this.user) return [];
		// this fetches intersection of project and global credentials the user has access to
		// credentials available to project but not user are not listed
		// used to limit available credentials to the user's access when calling agent builder
		return await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(this.user, {
			projectId: this.projectId,
		});
	}

	private async getAllProjectAndGlobalCredentials(): Promise<CredentialsEntity[]> {
		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds(true);
		const allCredsSet = new Set();
		const allCreds: CredentialsEntity[] = [];

		const addCreds = (creds: CredentialsEntity[]) => {
			for (const cred of creds) {
				if (!allCredsSet.has(cred.id)) {
					allCredsSet.add(cred.id);
					allCreds.push(cred);
				}
			}
		};

		addCreds(projectCredentials);
		addCreds(globalCredentials);

		return allCreds;
	}
}

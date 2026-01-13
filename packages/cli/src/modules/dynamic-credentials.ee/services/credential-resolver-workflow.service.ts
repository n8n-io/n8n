import { CredentialsEntity, CredentialsRepository, In, WorkflowRepository } from '@n8n/db';
import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { ICredentialResolver } from '@n8n/decorators';
import { Service } from '@n8n/di';

type CredentialStatus = {
	credentialId: string;
	credentialName: string;
	resolverId: string;
	credentialType: string;
	status: 'missing' | 'configured';
};

function isCredentialStatus(obj: unknown): obj is CredentialStatus {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}
	return (
		'credentialId' in obj &&
		typeof obj.credentialId === 'string' &&
		'resolverId' in obj &&
		typeof obj.resolverId === 'string' &&
		'credentialType' in obj &&
		typeof obj.credentialType === 'string' &&
		'status' in obj &&
		(obj.status === 'missing' || obj.status === 'configured')
	);
}

@Service()
export class CredentialResolverWorkflowService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialRepository: CredentialsRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
	) {}

	private async getResolver(resolverId: string): Promise<{
		resolverInstance: ICredentialResolver;
		resolverConfig: Record<string, unknown>;
	}> {
		const resolver = await this.resolverRepository.findOneBy({ id: resolverId });
		if (!resolver) {
			throw new Error('Credential resolver not found');
		}
		const resolverInstance = this.resolverRegistry.getResolverByTypename(resolver.type);
		if (!resolverInstance) {
			throw new Error('Credential resolver implementation not found');
		}
		try {
			const decryptedConfig = this.cipher.decrypt(resolver.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			return {
				resolverInstance,
				resolverConfig,
			};
		} catch (error) {
			throw new Error('Failed to decrypt or parse resolver configuration');
		}
	}

	/**
	 * Checks the status of all resolvable credentials in a workflow.
	 * Tests credential availability by attempting to retrieve secrets using the provided identity token.
	 *
	 * @param workflowId - The workflow ID to check
	 * @param identityToken - Bearer token for credential authorization
	 * @returns Array of credential statuses (configured/missing) with resolver info
	 * @throws {Error} When workflow is not found or resolver configuration is invalid
	 */
	async getWorkflowStatus(workflowId: string, identityToken: string) {
		const workflow = await this.workflowRepository.get({
			id: workflowId,
		});

		if (!workflow) {
			throw new Error('Workflow not found');
		}

		const resolverId = workflow.settings?.credentialResolverId;

		let workflowResolverInstance: ICredentialResolver | null = null;
		let workflowResolverConfig: Record<string, unknown> | null = null;

		if (resolverId) {
			const { resolverInstance, resolverConfig } = await this.getResolver(resolverId);
			workflowResolverInstance = resolverInstance;
			workflowResolverConfig = resolverConfig;
		}

		const credentialsToCheck: string[] = [];

		for (const node of workflow.nodes ?? []) {
			for (const credentialName in node.credentials ?? {}) {
				const credentialData = node.credentials?.[credentialName];
				// Fetch credentials from the DB using the credentialData.id
				if (credentialData?.id) {
					credentialsToCheck.push(credentialData.id);
				}
			}
		}

		if (credentialsToCheck.length === 0) {
			return [];
		}

		const credentials = await this.credentialRepository.find({
			where: {
				id: In(credentialsToCheck),
				isResolvable: true,
			},
		});
		// Get all credentials from the DB based on the ids collected above and resolvable being true

		const credentialStatusPromises = credentials.map(async (credential) => {
			return await this.checkCredentialStatus(credential, {
				workflowResolverInstance,
				workflowResolverConfig,
				resolverId,
				identityToken,
			});
		});

		return (await Promise.all(credentialStatusPromises)).filter(isCredentialStatus);
	}

	private async checkCredentialStatus(
		credential: CredentialsEntity,
		options: {
			workflowResolverInstance: ICredentialResolver | null;
			workflowResolverConfig: Record<string, unknown> | null;
			resolverId: string | undefined;
			identityToken: string;
		},
	): Promise<CredentialStatus | null> {
		let resolverInstance: ICredentialResolver | null = options.workflowResolverInstance;
		let resolverConfig: Record<string, unknown> | null = options.workflowResolverConfig;
		const credentialResolverId = credential.resolverId ?? options.resolverId;
		if (!credentialResolverId) {
			return null;
		}
		if (credentialResolverId !== options.resolverId) {
			const {
				resolverInstance: credentialResolverInstance,
				resolverConfig: credentialResolverConfig,
			} = await this.getResolver(credentialResolverId);
			resolverInstance = credentialResolverInstance;
			resolverConfig = credentialResolverConfig;
		}

		if (resolverConfig && resolverInstance) {
			try {
				await resolverInstance.getSecret(
					credential.id,
					{ identity: options.identityToken, version: 1 },
					{
						configuration: resolverConfig,
						resolverName: resolverInstance.metadata.name,
						resolverId: credentialResolverId,
					},
				);
				return {
					credentialId: credential.id,
					resolverId: credentialResolverId,
					credentialName: credential.name,
					status: 'configured',
					credentialType: credential.type,
				};
			} catch (error) {
				// Handle error (e.g., log it, collect status, etc.
				return {
					credentialId: credential.id,
					resolverId: credentialResolverId,
					credentialName: credential.name,
					status: 'missing',
					credentialType: credential.type,
				};
			}
		}
		return null;
	}
}

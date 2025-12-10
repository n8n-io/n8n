import { CredentialsRepository, In, WorkflowRepository } from '@n8n/db';
import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { ICredentialResolver } from '@n8n/decorators';
import { Service } from '@n8n/di';

@Service()
export class CredentialResolverWorkflowService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialRepository: CredentialsRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
	) {}

	private async getResolver(resolverId: string) {
		const resolver = await this.resolverRepository.findOneBy({ id: resolverId });
		if (!resolver) {
			throw new Error('Credential resolver not found');
		}
		const resolverInstance = this.resolverRegistry.getResolverByName(resolver.type);
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

		const credentialsToCheck: Array<{ credentialId: string }> = [];

		for (const node of workflow.nodes ?? []) {
			for (const credentialName in node.credentials ?? {}) {
				const credentialData = node.credentials?.[credentialName];
				// Fetch credentials from the DB using the credentialData.id
				if (credentialData?.id) {
					credentialsToCheck.push({ credentialId: credentialData.id });
				}
			}
		}

		const credentials = await this.credentialRepository.find({
			where: {
				id: In(credentialsToCheck.map((c) => c.credentialId)),
				isResolvable: true,
				// TODO: filter on isResolvable true only once we have a migration to add the column with default false
			},
		});
		// Get all credentials from the DB based on the ids collected above and resolvable being true
		//
		const credentialsStatuses: Array<{
			credentialId: string;
			resolverId: string;
			credentialType: string;
			status: 'missing' | 'configured';
		}> = [];

		for (const credential of credentials) {
			if (credential.isResolvable) {
				let resolverInstance: ICredentialResolver | null = workflowResolverInstance;
				let resolverConfig: Record<string, unknown> | null = workflowResolverConfig;
				const credentialResolverId = credential.resolverId ?? resolverId;
				if (credentialResolverId) {
					if (credentialResolverId !== resolverId) {
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
								{ identity: identityToken, version: 1 },
								{
									configuration: resolverConfig,
									resolverName: resolverInstance.metadata.name,
									resolverId: credentialResolverId,
								},
							);
							credentialsStatuses.push({
								credentialId: credential.id,
								resolverId: credentialResolverId,
								status: 'configured',
								credentialType: credential.type,
							});
						} catch (error) {
							// Handle error (e.g., log it, collect status, etc.
							credentialsStatuses.push({
								credentialId: credential.id,
								resolverId: credentialResolverId,
								status: 'missing',
								credentialType: credential.type,
							});
						}
					}
				}
			}
		}

		return credentialsStatuses;
	}
}

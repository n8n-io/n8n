import { CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	CredentialCheckResult,
	CredentialCheckStatus,
	DynamicCredentialCheckProxyProvider,
	IExecutionContext,
} from 'n8n-workflow';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { CreateCsrfStateData, OauthService } from '@/oauth/oauth.service';

import { ExecutionContextService } from 'n8n-core';
import { CredentialResolverWorkflowService } from './credential-resolver-workflow.service';

@Service()
export class CredentialCheckProxyService implements DynamicCredentialCheckProxyProvider {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
		private readonly executionContextService: ExecutionContextService,
		private readonly oauthService: OauthService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
	) {}

	async checkCredentialStatus(
		workflowId: string,
		executionContext: IExecutionContext,
	): Promise<CredentialCheckResult> {
		const plaintext = await this.executionContextService.decryptExecutionContext(executionContext);

		if (!plaintext.credentials) {
			throw new Error(
				'Execution context is present but contains no credential context. Ensure credential context establishment hooks are configured for this workflow.',
			);
		}

		const statuses = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			plaintext.credentials,
		);

		const credentials: CredentialCheckStatus[] = await Promise.all(
			statuses.map(async (status) => {
				const checkStatus: CredentialCheckStatus = {
					credentialId: status.credentialId,
					credentialName: status.credentialName,
					credentialType: status.credentialType,
					resolverId: status.resolverId,
					status: status.status,
				};

				if (status.status === 'missing' && status.resolverId) {
					checkStatus.authorizationUrl = await this.generateAuthorizationUrl(
						status.credentialId,
						status.resolverId,
						plaintext.credentials!,
					);
				}

				return checkStatus;
			}),
		);

		const readyToExecute = credentials.every((c) => c.status === 'configured');

		return { readyToExecute, credentials };
	}

	private async generateAuthorizationUrl(
		credentialId: string,
		resolverId: string,
		credentialContext: { identity?: string; metadata?: Record<string, unknown> },
	): Promise<string | undefined> {
		const credential = await this.enterpriseCredentialsService.getOne(credentialId);
		if (!credential) return undefined;

		const csrfData: CreateCsrfStateData = {
			cid: credential.id,
			origin: 'dynamic-credential',
			authorizationHeader: credentialContext.identity ? `Bearer ${credentialContext.identity}` : '',
			authMetadata: credentialContext.metadata,
			credentialResolverId: resolverId,
		};

		const callerData: [CredentialsEntity, CreateCsrfStateData] = [credential, csrfData];

		let authorizationUrl: string | undefined;

		if (credential.type.toLowerCase().includes('oauth2')) {
			authorizationUrl = await this.oauthService.generateAOauth2AuthUri(...callerData);
		} else if (credential.type.toLowerCase().includes('oauth1')) {
			authorizationUrl = await this.oauthService.generateAOauth1AuthUri(...callerData);
		}

		return authorizationUrl;
	}
}

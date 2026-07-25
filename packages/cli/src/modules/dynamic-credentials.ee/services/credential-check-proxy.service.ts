import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	CredentialCheckResult,
	CredentialCheckStatus,
	DynamicCredentialCheckProxyProvider,
	ICredentialContext,
	IExecutionContext,
} from 'n8n-workflow';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { UrlService } from '@/services/url.service';

import { ExecutionContextService } from 'n8n-core';
import { AuthorizeIntentService } from './authorize-intent.service';
import { CredentialResolverWorkflowService } from './credential-resolver-workflow.service';
import { DynamicCredentialService } from './dynamic-credential.service';

@Service()
export class CredentialCheckProxyService implements DynamicCredentialCheckProxyProvider {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
		private readonly executionContextService: ExecutionContextService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly authorizeIntentService: AuthorizeIntentService,
		private readonly dynamicCredentialService: DynamicCredentialService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
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

	/**
	 * Returns a short n8n link that, when opened, redirects to the provider's OAuth
	 * authorization page. The heavy work of building the provider URL (OAuth discovery /
	 * dynamic client registration) is deferred to click-time, so the gate response stays
	 * fast and small. The caller identity is captured in a server-side intent so the
	 * connection binds to the right subject regardless of who opens the link.
	 */
	private async generateAuthorizationUrl(
		credentialId: string,
		resolverId: string,
		credentialContext: ICredentialContext,
	): Promise<string | undefined> {
		const credential = await this.enterpriseCredentialsService.getOne(credentialId);
		if (!credential) return undefined;

		const type = credential.type.toLowerCase();
		if (!type.includes('oauth2') && !type.includes('oauth1')) return undefined;

		// Bind the link to the intended n8n user when the resolver names one. Fail
		// closed if the resolver maps to a user but can't resolve one right now —
		// issuing an unbindable link would let any clicker complete the connection.
		const ownership = await this.dynamicCredentialService.resolveOwningUserIdForAuthorization(
			credentialContext,
			resolverId,
		);
		if (ownership.status === 'unresolved') return undefined;

		const token = await this.authorizeIntentService.create({
			credentialId: credential.id,
			resolverId,
			identity: credentialContext.identity ?? '',
			userId: ownership.status === 'bound' ? ownership.userId : undefined,
			metadata: credentialContext.metadata,
		});

		const basePath = this.urlService.getInstanceBaseUrl();
		const restPath = this.globalConfig.endpoints.rest;
		return `${basePath}/${restPath}/credentials/${credential.id}/authorize?token=${token}`;
	}
}

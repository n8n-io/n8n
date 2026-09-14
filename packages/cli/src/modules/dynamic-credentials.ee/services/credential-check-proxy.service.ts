import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	CredentialCheckOptions,
	CredentialCheckResult,
	CredentialCheckStatus,
	DynamicCredentialCheckProxyProvider,
	ICredentialContext,
	ICredentialType,
	Themed,
} from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NodeTypes } from '@/node-types';
import { UrlService } from '@/services/url.service';

import { ExecutionContextService } from 'n8n-core';
import { AuthorizeIntentService } from './authorize-intent.service';
import { CredentialResolverWorkflowService } from './credential-resolver-workflow.service';
import { DynamicCredentialService } from './dynamic-credential.service';

/** The shell is light-theme only, so themed icons collapse to their light variant. */
const lightVariant = (value: Themed<string> | undefined): string | undefined =>
	typeof value === 'string' ? value : value?.light;

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
		private readonly credentialTypes: CredentialTypes,
		private readonly nodeTypes: NodeTypes,
	) {}

	async checkCredentialStatus(
		workflowId: string,
		executionContext: {
			credentials?: string;
		},
		options?: CredentialCheckOptions,
	): Promise<CredentialCheckResult> {
		if (!executionContext.credentials) {
			throw new Error(
				'Execution context is present but contains no credential context. Ensure credential context establishment hooks are configured for this workflow.',
			);
		}
		const plaintext = await this.executionContextService.decryptCredentialContext(
			executionContext.credentials,
		);

		if (!plaintext) {
			throw new Error(
				'Execution context is present but contains no credential context. Ensure credential context establishment hooks are configured for this workflow.',
			);
		}

		const statuses = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			plaintext,
			{ rootNodes: options?.rootNodes },
		);

		const credentials: CredentialCheckStatus[] = await Promise.all(
			statuses.map(async (status) => {
				const checkStatus: CredentialCheckStatus = {
					credentialId: status.credentialId,
					credentialName: status.credentialName,
					credentialType: status.credentialType,
					resolverId: status.resolverId,
					status: status.status,
					iconUrl: this.resolveCredentialIconUrl(status.credentialType),
				};

				if (status.status === 'missing' && status.resolverId) {
					checkStatus.authorizationUrl = await this.generateAuthorizationUrl(
						status.credentialId,
						status.resolverId,
						plaintext,
					);
				}

				if (status.status === 'configured' && status.resolverId) {
					checkStatus.revokeUrl = this.generateRevokeUrl(status.credentialId, status.resolverId);
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
	/**
	 * Absolute URL of the credential type's provider icon, so consumers that render
	 * outside the editor — the form hosting shell, rendered from nodes-base — can
	 * show it without reaching into the credential registry. Mirrors the editor's
	 * `CredentialIcon.vue`: the type's own `iconUrl` first, then an
	 * `icon: 'node:<nodeType>'` reference resolved to that node's icon, then the
	 * `extends` chain. Types with neither already inherit an icon from a supported
	 * node at load time.
	 */
	private resolveCredentialIconUrl(
		credentialType: string,
		seen = new Set<string>(),
	): string | undefined {
		if (!credentialType || seen.has(credentialType)) return undefined;
		seen.add(credentialType);

		let type: ICredentialType;
		try {
			type = this.credentialTypes.getByName(credentialType);
		} catch {
			return undefined;
		}

		const ownIconUrl = lightVariant(type.iconUrl);
		if (ownIconUrl) return this.toAbsoluteIconUrl(ownIconUrl);

		const icon = lightVariant(type.icon);
		if (icon?.startsWith('node:')) {
			const nodeIconUrl = this.resolveNodeIconUrl(icon.slice('node:'.length));
			if (nodeIconUrl) return this.toAbsoluteIconUrl(nodeIconUrl);
		}

		for (const parentType of type.extends ?? []) {
			const inherited = this.resolveCredentialIconUrl(parentType, seen);
			if (inherited) return inherited;
		}

		return undefined;
	}

	private resolveNodeIconUrl(nodeTypeName: string): string | undefined {
		try {
			const { description } = this.nodeTypes.getByName(nodeTypeName);
			return lightVariant(description.iconUrl);
		} catch {
			return undefined;
		}
	}

	/** Loader-generated icon paths are instance-relative (`icons/<package>/…`), and the
	 * shell renders on a webhook path where that wouldn't resolve. */
	private toAbsoluteIconUrl(iconUrl: string): string {
		if (/^https?:\/\//i.test(iconUrl)) return iconUrl;
		return `${this.urlService.getInstanceBaseUrl()}/${iconUrl.replace(/^\/+/, '')}`;
	}

	/** Deletes the caller's own connection; mirrors `workflow-status.controller.ts`. */
	private generateRevokeUrl(credentialId: string, resolverId: string): string {
		const basePath = this.urlService.getInstanceBaseUrl();
		const restPath = this.globalConfig.endpoints.rest;
		return `${basePath}/${restPath}/credentials/${credentialId}/revoke?resolverId=${encodeURIComponent(resolverId)}`;
	}

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

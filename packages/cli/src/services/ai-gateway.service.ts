import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { UserRepository } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { AiGatewayConfigDto, AiGatewayUsageResponse } from '@n8n/api-types';

import { N8N_VERSION, AI_ASSISTANT_SDK_VERSION } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { License } from '@/license';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@/services/url.service';

interface GatewayTokenResponse {
	token: string;
	expiresIn: number;
}

interface GatewayWalletResponse {
	budget: number;
	balance: number;
}

@Service()
export class AiGatewayService {
	private readonly tokenCache = new Map<
		string,
		{ token: string; expiresAt: number; refreshAt: number }
	>();
	private readonly TOKEN_CACHE_MAX_SIZE = 500;
	private readonly pendingTokenRequests = new Map<string, Promise<string>>();

	/** Cached gateway config (nodes, credential types, provider routing). Refreshed every hour. */
	private gatewayConfig: AiGatewayConfigDto | null = null;
	private configFetchedAt = 0;
	private static readonly CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly userRepository: UserRepository,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Returns the userId to use for AI Gateway token issuance.
	 * If userId is provided it is returned as-is. Otherwise resolves the personal
	 * project owner via projectId (direct) or workflowId (lookup → project → owner).
	 * Falls back to the instance owner for team projects or when no context is available.
	 */
	private async resolveUserId({
		userId,
		projectId,
		workflowId,
	}: {
		userId: string | undefined;
		projectId: string | undefined;
		workflowId: string | undefined;
	}): Promise<string | undefined> {
		if (userId) return userId;
		const resolvedProjectId =
			projectId ??
			(workflowId
				? (await this.ownershipService.getWorkflowProjectCached(workflowId))?.id
				: undefined);
		const owner = resolvedProjectId
			? await this.ownershipService.getPersonalProjectOwnerCached(resolvedProjectId)
			: null;
		if (owner) return owner.id;
		try {
			return (await this.ownershipService.getInstanceOwner()).id;
		} catch {
			return undefined;
		}
	}

	/**
	 * Returns a synthetic credential for the given type, pointing the node at the gateway
	 * instead of the real provider. Called from `CredentialsHelper.getDecrypted` when
	 * `nodeCredentials.__aiGatewayManaged` is set.
	 */
	async getSyntheticCredential({
		credentialType,
		userId,
		workflowId,
		projectId,
	}: {
		credentialType: string;
		userId: string | undefined;
		workflowId?: string;
		projectId?: string;
	}): Promise<ICredentialDataDecryptedObject> {
		if (!this.licenseState.isAiGatewayLicensed()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.AI_GATEWAY);
		}

		const baseUrl = this.requireBaseUrl();

		const config = await this.getGatewayConfig();
		const providerConfig = config.providerConfig[credentialType];
		if (!providerConfig) {
			throw new UserError(`Credential type "${credentialType}" is not supported by AI Gateway.`);
		}

		const resolvedUserId = await this.resolveUserId({ userId, projectId, workflowId });
		if (!resolvedUserId) {
			throw new UserError('Failed to resolve user for AI Gateway attribution.');
		}
		const jwt = await this.getOrFetchToken(resolvedUserId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid AI Gateway token.');
		}
		return {
			[providerConfig.apiKeyField]: jwt,
			[providerConfig.urlField]: `${baseUrl}${providerConfig.gatewayPath}`,
		};
	}

	/**
	 * Returns paginated usage history for the given user.
	 */
	async getUsage(userId: string, offset: number, limit: number): Promise<AiGatewayUsageResponse> {
		const baseUrl = this.requireBaseUrl();

		const jwt = await this.getOrFetchToken(userId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid AI Gateway token.');
		}

		const url = new URL(`${baseUrl}/v1/gateway/usage`);
		url.searchParams.set('offset', String(offset));
		url.searchParams.set('limit', String(limit));

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: { Authorization: `Bearer ${jwt}` },
		});

		if (!response.ok) {
			throw new UserError(`Failed to fetch AI Gateway usage: HTTP ${response.status}`);
		}

		const data = (await response.json()) as AiGatewayUsageResponse;
		if (!Array.isArray(data.entries) || typeof data.total !== 'number') {
			throw new UserError('AI Gateway returned an invalid usage response.');
		}
		return data;
	}

	/**
	 * Returns the current wallet (budget and remaining balance) for the given user.
	 */
	async getWallet(userId: string): Promise<GatewayWalletResponse> {
		const baseUrl = this.requireBaseUrl();

		const jwt = await this.getOrFetchToken(userId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid AI Gateway token.');
		}
		const response = await fetch(`${baseUrl}/v1/gateway/wallet`, {
			method: 'GET',
			headers: { Authorization: `Bearer ${jwt}` },
		});

		if (!response.ok) {
			throw new UserError(`Failed to fetch AI Gateway wallet: HTTP ${response.status}`);
		}

		return this.parseWalletResponse(await response.json());
	}

	private parseWalletResponse(data: unknown): GatewayWalletResponse {
		const d = data as GatewayWalletResponse;
		if (typeof d.budget !== 'number' || typeof d.balance !== 'number') {
			throw new UserError('AI Gateway returned an invalid wallet response.');
		}
		return d;
	}

	private requireBaseUrl(): string {
		const url = this.globalConfig.aiAssistant.baseUrl;
		if (!url) throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		return url;
	}

	private isConfigStale(): boolean {
		return (
			this.gatewayConfig === null ||
			Date.now() - this.configFetchedAt > AiGatewayService.CONFIG_TTL_MS
		);
	}

	async getGatewayConfig(): Promise<AiGatewayConfigDto> {
		if (!this.isConfigStale()) return this.gatewayConfig!;

		const baseUrl = this.requireBaseUrl();

		const response = await fetch(`${baseUrl}/v1/gateway/config`);
		if (!response.ok) {
			throw new UserError(`Failed to fetch AI Gateway config: HTTP ${response.status}`);
		}

		const data = (await response.json()) as AiGatewayConfigDto;
		if (
			!Array.isArray(data.nodes) ||
			!Array.isArray(data.credentialTypes) ||
			typeof data.providerConfig !== 'object'
		) {
			throw new UserError('AI Gateway returned an invalid config response.');
		}

		this.gatewayConfig = data;
		this.configFetchedAt = Date.now();
		return data;
	}

	/**
	 * Headers required by the AI Gateway credentials endpoint (`HeadersMetadataDto`).
	 */
	private buildGatewayCredentialsHeaders(userId: string): Record<string, string> {
		const headers: Record<string, string> = {};
		headers['Content-Type'] = 'application/json';
		headers['x-user-id'] = userId;
		headers['x-consumer-id'] = this.license.getConsumerId();
		headers['x-sdk-version'] = AI_ASSISTANT_SDK_VERSION;
		headers['x-n8n-version'] = N8N_VERSION;
		headers['x-instance-id'] = this.instanceSettings.instanceId;
		return headers;
	}

	/**
	 * Returns a cached JWT for `instanceId:userId`, fetching a fresh one from the gateway
	 * if missing or past 90% of its lifetime. Deduplicates concurrent requests for the
	 * same user so only one fetch is in-flight at a time.
	 */
	private async getOrFetchToken(userId: string): Promise<string> {
		const key = `${this.instanceSettings.instanceId}:${userId}`;
		const cached = this.tokenCache.get(key);

		if (cached && cached.refreshAt > Date.now()) {
			return cached.token;
		}

		const pending = this.pendingTokenRequests.get(key);
		if (pending) return await pending;

		const promise = this.fetchAndCacheToken(userId, key);
		this.pendingTokenRequests.set(key, promise);
		try {
			return await promise;
		} finally {
			this.pendingTokenRequests.delete(key);
		}
	}

	private async fetchAndCacheToken(userId: string, key: string): Promise<string> {
		const baseUrl = this.requireBaseUrl();
		const [licenseCert, user] = await Promise.all([
			this.license.loadCertStr(),
			this.userRepository.findOneBy({ id: userId }),
		]);

		const response = await fetch(`${baseUrl}/v1/gateway/credentials`, {
			method: 'POST',
			headers: this.buildGatewayCredentialsHeaders(userId),
			body: JSON.stringify({
				licenseCert,
				...(user?.email && { userEmail: user.email }),
				...(user && {
					userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
				}),
				instanceUrl: this.urlService.getInstanceBaseUrl(),
			}),
		});

		if (!response.ok) {
			throw new UserError(`Failed to fetch AI Gateway token: HTTP ${response.status}`);
		}

		const { token, expiresIn } = (await response.json()) as GatewayTokenResponse;
		if (!token || typeof expiresIn !== 'number') {
			throw new UserError('AI Gateway returned an invalid token response.');
		}
		if (this.tokenCache.size >= this.TOKEN_CACHE_MAX_SIZE) {
			this.tokenCache.delete(this.tokenCache.keys().next().value as string);
		}
		const lifetimeMs = expiresIn * 1000;
		this.tokenCache.set(key, {
			token,
			expiresAt: Date.now() + lifetimeMs,
			refreshAt: Date.now() + lifetimeMs * 0.9,
		});
		return token;
	}
}

import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { AiGatewayConfigDto, AiGatewayUsageResponse } from '@n8n/api-types';

import { N8N_VERSION, AI_ASSISTANT_SDK_VERSION } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { License } from '@/license';

interface GatewayTokenResponse {
	token: string;
	expiresIn: number;
}

interface GatewayCreditsResponse {
	creditsQuota: number;
	creditsRemaining: number;
}

@Service()
export class AiGatewayService {
	private readonly tokenCache = new Map<
		string,
		{ token: string; expiresAt: number; refreshAt: number }
	>();
	private readonly TOKEN_CACHE_MAX_SIZE = 500;

	/** Cached gateway config (nodes, credential types, provider routing). Refreshed every hour. */
	private gatewayConfig: AiGatewayConfigDto | null = null;
	private configFetchedAt = 0;
	private static readonly CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * Returns the gateway config (nodes, credential types, provider routing),
	 * fetching from the gateway service and caching for 1 hour.
	 */
	async getGatewayConfig(): Promise<AiGatewayConfigDto> {
		return await this.getOrFetchConfig();
	}

	/**
	 * Returns a synthetic credential for the given type, pointing the node at the gateway
	 * instead of the real provider. Called from `CredentialsHelper.getDecrypted` when
	 * `nodeCredentials.__aiGatewayManaged` is set.
	 */
	async getSyntheticCredential(
		credentialType: string,
		userId: string,
	): Promise<ICredentialDataDecryptedObject> {
		if (
			!this.globalConfig.aiAssistant.aiGatewayDevMode &&
			!this.licenseState.isAiGatewayLicensed()
		) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.AI_GATEWAY);
		}

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

		const config = await this.getOrFetchConfig();
		const providerConfig = config.providerConfig[credentialType];
		if (!providerConfig) {
			throw new UserError(`Credential type "${credentialType}" is not supported by AI Gateway.`);
		}

		const jwt = await this.getOrFetchToken(userId);
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
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

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

		return (await response.json()) as AiGatewayUsageResponse;
	}

	/**
	 * Returns the current credits quota and remaining credits for the given user.
	 */
	async getCreditsRemaining(userId: string): Promise<GatewayCreditsResponse> {
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

		const jwt = await this.getOrFetchToken(userId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid AI Gateway token.');
		}
		const response = await fetch(`${baseUrl}/v1/gateway/credits`, {
			method: 'GET',
			headers: { Authorization: `Bearer ${jwt}` },
		});

		if (!response.ok) {
			throw new UserError(`Failed to fetch AI Gateway credits: HTTP ${response.status}`);
		}

		const data = (await response.json()) as GatewayCreditsResponse;
		if (typeof data.creditsQuota !== 'number' || typeof data.creditsRemaining !== 'number') {
			throw new UserError('AI Gateway returned an invalid credits response.');
		}

		return data;
	}

	private isConfigStale(): boolean {
		return (
			this.gatewayConfig === null ||
			Date.now() - this.configFetchedAt > AiGatewayService.CONFIG_TTL_MS
		);
	}

	private async getOrFetchConfig(): Promise<AiGatewayConfigDto> {
		if (!this.isConfigStale()) return this.gatewayConfig!;

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

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
	 * if missing or past 90% of its lifetime.
	 */
	private async getOrFetchToken(userId: string): Promise<string> {
		const key = `${this.instanceSettings.instanceId}:${userId}`;
		const cached = this.tokenCache.get(key);

		if (cached && cached.refreshAt > Date.now()) {
			return cached.token;
		}

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const licenseCert = await this.license.loadCertStr();

		const response = await fetch(`${baseUrl}/v1/gateway/credentials`, {
			method: 'POST',
			headers: this.buildGatewayCredentialsHeaders(userId),
			body: JSON.stringify({ licenseCert }),
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

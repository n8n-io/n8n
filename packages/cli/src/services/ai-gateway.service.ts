import { AI_GATEWAY_CREDENTIAL_TYPES } from '@n8n/constants';
import { GlobalConfig } from '@n8n/config';
import { LicenseState, Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { License } from '@/license';

type AiGatewayCredentialType = (typeof AI_GATEWAY_CREDENTIAL_TYPES)[number];

interface GatewayTokenResponse {
	token: string;
	expiresIn: number;
}

interface GatewayCreditsResponse {
	creditsQuota: number;
	creditsRemaining: number;
}

/**
 * Per-provider routing config.
 *
 * - `gatewayPath`  — path appended to `aiAssistant.baseUrl` in the synthetic credential
 * - `urlField`     — credential field the node reads for the base URL (`url` for most, `host` for googlePalmApi)
 * - `apiKeyField`  — credential field the node reads for the API key (`apiKey` for most)
 *
 * To add a provider: add an entry here + add its type to `AI_GATEWAY_CREDENTIAL_TYPES` in `@n8n/constants`.
 */
const GATEWAY_PROVIDER_CONFIG: Record<
	AiGatewayCredentialType,
	{ gatewayPath: string; urlField: string; apiKeyField: string }
> = {
	googlePalmApi: { gatewayPath: '/v1/gateway/google', urlField: 'host', apiKeyField: 'apiKey' },
};

@Service()
export class AiGatewayService {
	private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();
	private readonly TOKEN_CACHE_MAX_SIZE = 500;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	/**
	 * Returns a synthetic credential for the given type, pointing the node at the gateway
	 * instead of the real provider. Called from `CredentialsHelper.getDecrypted` when
	 * `nodeCredentials.__aiGatewayManaged` is set.
	 */
	async getSyntheticCredential(
		credentialType: string,
		userId: string,
	): Promise<ICredentialDataDecryptedObject> {
		// TODO: enforce license before shipping — throw FeatureNotLicensedError when not licensed
		if (!this.licenseState.isAiCreditsLicensed()) {
			this.logger.error('AI Gateway: license check failed (feat:aiCredits not licensed)');
		}

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

		const config = GATEWAY_PROVIDER_CONFIG[credentialType as AiGatewayCredentialType];
		if (!config) {
			throw new UserError(`Credential type "${credentialType}" is not supported by AI Gateway.`);
		}

		const jwt = await this.getOrFetchToken(userId);
		return { [config.apiKeyField]: jwt, [config.urlField]: `${baseUrl}${config.gatewayPath}` };
	}

	/**
	 * Returns the current credits quota and remaining credits for the given user.
	 */
	async getCreditsRemaining(userId: string): Promise<GatewayCreditsResponse> {
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) {
			throw new UserError('AI Gateway is not configured. Set the AI assistant base URL.');
		}

		const licenseCert = await this.license.loadCertStr();
		const response = await fetch(`${baseUrl}/v1/gateway/credits`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ licenseCert, instanceId: this.instanceSettings.instanceId, userId }),
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

	/**
	 * Returns a cached JWT for `instanceId:userId`, fetching a fresh one from the gateway
	 * if missing or within 1 minute of expiry.
	 */
	private async getOrFetchToken(userId: string): Promise<string> {
		const key = `${this.instanceSettings.instanceId}:${userId}`;
		const cached = this.tokenCache.get(key);

		if (cached && cached.expiresAt > Date.now() + 60_000) {
			return cached.token;
		}

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const licenseCert = await this.license.loadCertStr();

		const response = await fetch(`${baseUrl}/v1/gateway/credentials`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ licenseCert, instanceId: this.instanceSettings.instanceId, userId }),
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
		this.tokenCache.set(key, { token, expiresAt: Date.now() + expiresIn * 1000 });
		return token;
	}
}

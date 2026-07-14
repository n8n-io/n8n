import type { AiGatewayConfigDto, AiGatewayUsageResponse } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IHttpRequestMethods } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

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

	private static readonly GATEWAY_PATH_PREFIX = '/v1/gateway';

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
		private readonly licenseState: LicenseState,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly userRepository: UserRepository,
		private readonly urlService: UrlService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/**
	 * Performs a request against the AI Gateway and returns the parsed body.
	 */
	private async gatewayRequest<T>(
		options: {
			method: IHttpRequestMethods;
			url: string;
			headers?: Record<string, string>;
			body?: unknown;
		},
		errorMessage: string,
	): Promise<T> {
		const response = await this.outboundHttp
			.requests({
				ssrf: 'disabled', // the gateway base URL is n8n-owned configuration
			})
			.request({
				method: options.method,
				url: options.url,
				...(options.headers ? { headers: options.headers } : {}),
				...(options.body !== undefined ? { body: options.body, json: true } : {}),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true, // A non-2xx status is surfaced as a `UserError` carrying the status code
			});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw new UserError(`${errorMessage}: HTTP ${response.statusCode}`);
		}
		return response.body as T;
	}

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
		executionId,
	}: {
		credentialType: string;
		userId: string | undefined;
		workflowId?: string;
		projectId?: string;
		executionId?: string;
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

		const urlFields = this.buildUrlFields(baseUrl, providerConfig, { executionId, workflowId });

		return {
			[providerConfig.apiKeyField]: jwt,
			...urlFields,
		};
	}

	/**
	 * Builds the credential URL field(s) pointing at the gateway.
	 *
	 * When `routing` is present, each `<credential field> → <gateway path>` entry is
	 * rewritten to its gateway URL, letting a single credential fan out to multiple
	 * gateway providers. Otherwise falls back to the single `urlField`/`gatewayPath`.
	 */
	private buildUrlFields(
		baseUrl: string,
		providerConfig: { gatewayPath: string; urlField: string; routing?: Record<string, string> },
		context: { executionId?: string; workflowId?: string },
	): Record<string, string> {
		const routing = providerConfig.routing;
		if (routing && Object.keys(routing).length > 0) {
			return Object.fromEntries(
				Object.entries(routing).map(([urlField, gatewayPath]) => [
					urlField,
					this.buildGatewayUrl(baseUrl, gatewayPath, context),
				]),
			);
		}
		return {
			[providerConfig.urlField]: this.buildGatewayUrl(baseUrl, providerConfig.gatewayPath, context),
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

		const data = await this.gatewayRequest<AiGatewayUsageResponse>(
			{
				method: 'GET',
				url: url.toString(),
				headers: { Authorization: `Bearer ${jwt}` },
			},
			'Failed to fetch AI Gateway usage',
		);
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
		const data = await this.gatewayRequest<unknown>(
			{
				method: 'GET',
				url: `${baseUrl}/v1/gateway/wallet`,
				headers: { Authorization: `Bearer ${jwt}` },
			},
			'Failed to fetch AI Gateway wallet',
		);

		return this.parseWalletResponse(data);
	}

	private parseWalletResponse(data: unknown): GatewayWalletResponse {
		const d = data as GatewayWalletResponse;
		if (typeof d.budget !== 'number' || typeof d.balance !== 'number') {
			throw new UserError('AI Gateway returned an invalid wallet response.');
		}
		return d;
	}

	/**
	 * Builds the gateway URL for a provider credential.
	 *
	 * When both `executionId` and `workflowId` are provided, embeds them as an
	 * `/exec/:executionId/:workflowId/` prefix inside the gateway path. The AI Gateway's
	 * URL-rewriting middleware strips this prefix before proxying upstream, so all SDK
	 * clients remain unaware of it while the gateway can record both IDs in usage metadata.
	 *
	 * Example (OpenAI):
	 *   without context → `<base>/v1/gateway/openai/v1`
	 *   with context    → `<base>/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/openai/v1`
	 */
	private buildGatewayUrl(
		baseUrl: string,
		gatewayPath: string,
		context: { executionId?: string; workflowId?: string },
	): string {
		if (context.executionId && context.workflowId) {
			if (!gatewayPath.startsWith(AiGatewayService.GATEWAY_PATH_PREFIX)) {
				return `${baseUrl}${gatewayPath}`;
			}
			const providerSuffix = gatewayPath.slice(AiGatewayService.GATEWAY_PATH_PREFIX.length);
			return `${baseUrl}${AiGatewayService.GATEWAY_PATH_PREFIX}/exec/${encodeURIComponent(context.executionId)}/${encodeURIComponent(context.workflowId)}${providerSuffix}`;
		}
		return `${baseUrl}${gatewayPath}`;
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

		const data = await this.gatewayRequest<AiGatewayConfigDto>(
			{
				method: 'GET',
				url: `${baseUrl}/v1/gateway/config`,
			},
			'Failed to fetch AI Gateway config',
		);
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

		const { token, expiresIn } = await this.gatewayRequest<GatewayTokenResponse>(
			{
				method: 'POST',
				url: `${baseUrl}/v1/gateway/credentials`,
				headers: this.buildGatewayCredentialsHeaders(userId),
				body: {
					licenseCert,
					...(user?.email && { userEmail: user.email }),
					...(user && {
						userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
					}),
					instanceUrl: this.urlService.getInstanceBaseUrl(),
				},
			},
			'Failed to fetch AI Gateway token',
		);
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

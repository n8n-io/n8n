import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { UserRepository } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { GatewayHttpRewriter } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INode,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
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

	private static readonly GATEWAY_PATH_PREFIX = '/v1/gateway';

	private static readonly PROXY_PATH_PREFIX = '/v1/gateway/proxy';

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

		const credential: ICredentialDataDecryptedObject = {
			[providerConfig.apiKeyField]: jwt,
		};

		// Community nodes that hard-code their base URL have no `urlField`; they are
		// redirected at the HTTP layer instead (see `buildHttpRewriter`).
		if (providerConfig.urlField) {
			credential[providerConfig.urlField] = this.buildGatewayUrl(
				baseUrl,
				providerConfig.gatewayPath,
				{ executionId, workflowId },
			);
		}

		return credential;
	}

	/**
	 * Builds the HTTP-layer rewriter installed on `additionalData` for executions.
	 * Reroutes outbound requests from gateway-managed nodes whose target host is a
	 * managed provider host (per gateway config `providerConfig[type].hosts`) through
	 * the gateway, injecting a `Bearer` token. This covers nodes that hard-code their
	 * base URL and so cannot be redirected via a credential `urlField` override.
	 *
	 * The returned closure reads `userId`/`workflowId`/`projectId`/`executionId` from
	 * the captured `additionalData` at request time (they are populated by then).
	 */
	buildHttpRewriter(additionalData: IWorkflowExecuteAdditionalData): GatewayHttpRewriter {
		return async (requestOptions: IHttpRequestOptions, node: INode) => {
			const managedTypes = this.getManagedCredentialTypes(node);
			if (managedTypes.length === 0) return undefined;

			const targetUrl = this.resolveRequestUrl(requestOptions);
			if (!targetUrl) return undefined;

			// Match on hostname (port- and case-insensitive) against the configured hosts.
			let hostname: string;
			try {
				hostname = new URL(targetUrl).hostname;
			} catch {
				return undefined;
			}

			const config = await this.getGatewayConfig();
			const matches = managedTypes.some((type) =>
				config.providerConfig[type]?.hosts?.includes(hostname),
			);
			if (!matches) return undefined;

			// From here the request is destined for a managed host: fail closed. If the
			// gateway/token is unavailable we throw rather than pass through, so a managed
			// node never silently leaks traffic (and its real key) to the real provider.
			const baseUrl = this.requireBaseUrl();
			const { userId, workflowId, projectId, executionId } = additionalData;
			const resolvedUserId = await this.resolveUserId({ userId, workflowId, projectId });
			if (!resolvedUserId) {
				throw new UserError('Failed to resolve user for AI Gateway attribution.');
			}
			const jwt = await this.getOrFetchToken(resolvedUserId);
			if (!jwt) {
				throw new UserError('Failed to obtain a valid AI Gateway token.');
			}

			return {
				...requestOptions,
				baseURL: undefined,
				url: this.buildProxyUrl(baseUrl, targetUrl, { executionId, workflowId }),
				headers: {
					...requestOptions.headers,
					Authorization: `Bearer ${jwt}`,
				},
			};
		};
	}

	private getManagedCredentialTypes(node: INode): string[] {
		const credentials = node.credentials;
		if (!credentials) return [];
		return Object.entries(credentials)
			.filter(([, details]) => details?.__aiGatewayManaged)
			.map(([type]) => type);
	}

	private resolveRequestUrl(requestOptions: IHttpRequestOptions): string | undefined {
		const { url, baseURL } = requestOptions;
		if (baseURL) {
			try {
				return new URL(url ?? '', baseURL).toString();
			} catch {
				return undefined;
			}
		}
		return url || undefined;
	}

	/**
	 * Builds a host-preserving proxy URL. The original host and path are embedded after
	 * the proxy prefix so the gateway can route to the correct upstream and inject the
	 * real provider credentials. Embeds execution context for attribution when available.
	 *
	 * Example: `https://api.browserbase.com/v1/fetch`
	 *   → `<base>/v1/gateway/proxy/api.browserbase.com/v1/fetch`
	 *   → with context: `<base>/v1/gateway/proxy/exec/<execId>/<wfId>/api.browserbase.com/v1/fetch`
	 */
	private buildProxyUrl(
		baseUrl: string,
		targetUrl: string,
		context: { executionId?: string; workflowId?: string },
	): string {
		const parsed = new URL(targetUrl);
		const hostAndPath = `${parsed.host}${parsed.pathname}`;
		const prefix = this.withExecPrefix(AiGatewayService.PROXY_PATH_PREFIX, context);
		return `${baseUrl}${prefix}/${hostAndPath}${parsed.search}`;
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
			return `${baseUrl}${this.withExecPrefix(AiGatewayService.GATEWAY_PATH_PREFIX, context)}${providerSuffix}`;
		}
		return `${baseUrl}${gatewayPath}`;
	}

	/**
	 * Appends an `/exec/:executionId/:workflowId` segment to a gateway path prefix when
	 * both IDs are present. The gateway's URL-rewriting middleware strips this segment
	 * before proxying upstream; it exists purely so the gateway can record both IDs in
	 * usage metadata. Returns the prefix unchanged when either ID is missing.
	 */
	private withExecPrefix(
		prefix: string,
		context: { executionId?: string; workflowId?: string },
	): string {
		if (!context.executionId || !context.workflowId) return prefix;
		return `${prefix}/exec/${encodeURIComponent(context.executionId)}/${encodeURIComponent(context.workflowId)}`;
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

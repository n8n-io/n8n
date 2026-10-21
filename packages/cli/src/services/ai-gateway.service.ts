import {
	AiGatewayConfigDto,
	getAgentModelProviderCredentialTypes,
	type AiGatewayUsageResponse,
	type AiGatewayWalletResponse,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { ICredentialDataDecryptedObject, IHttpRequestMethods, INode } from 'n8n-workflow';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { N8N_VERSION, AI_ASSISTANT_SDK_VERSION } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { BadRequestError } from '@n8n/errors';
import { License } from '@/license';
import { checkAiGatewayEligibility } from '@/services/ai-gateway-eligibility';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@n8n/backend-services';

interface GatewayTokenResponse {
	token: string;
	expiresIn: number;
}

/** Who a request made on a user's behalf is for. The gateway bills and attributes it by this. */
export interface AiGatewayRequestAttribution {
	/** The Instance AI thread that owns the task. */
	instanceAiThreadId: string;
	/** An Instance AI background task. The gateway bills these requests to Assistant credits. */
	instanceAiTaskId: string;
}

/** A gateway response with a status that is not 2xx. */
export interface AiGatewayErrorResponse {
	statusCode: number;
	body: unknown;
}

interface GatewayUrlContext {
	executionId?: string;
	workflowId?: string;
	projectId?: string;
	agentId?: string;
	instanceAiThreadId?: string;
	instanceAiTaskId?: string;
}

export type AiGatewayAvailability =
	| { available: true; config: AiGatewayConfigDto }
	| { available: false };

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

	/**
	 * Timestamp of the last failed config fetch. A failure is cached briefly so a
	 * down gateway isn't re-hit on every `isAvailable()` call (fired per MCP tool call).
	 */
	private configFetchFailedAt = 0;
	private static readonly CONFIG_FAILURE_TTL_MS = 60 * 1000; // 1 minute

	private static readonly GATEWAY_PATH_PREFIX = '/v1/gateway';

	/** A provider name is one URL segment, so it cannot change the structure of the URL. */
	private static readonly PROVIDER_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

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
	 * Whether this instance is licensed and configured for n8n Connect.
	 */
	isEnabled(): boolean {
		return (
			this.licenseState.isAiGatewayLicensed() &&
			this.globalConfig.aiGateway.enabled &&
			!!this.globalConfig.aiAssistant.baseUrl
		);
	}

	assertEnabled(): void {
		if (!this.isEnabled()) {
			throw new BadRequestError('Gateway credits are not enabled on this instance');
		}
	}

	/**
	 * Performs a request against the AI Gateway and returns the parsed body.
	 *
	 * For a status that is not 2xx, it throws the error from `options.mapErrorResponse` if it is
	 * given. Otherwise it throws a `UserError` with `errorMessage` and the status code.
	 */
	private async gatewayRequest<T>(
		options: {
			method: IHttpRequestMethods;
			url: string;
			headers?: Record<string, string>;
			body?: unknown;
			disableFollowRedirect?: boolean;
			/** Returns the error to throw for a response with a status that is not 2xx. */
			mapErrorResponse?: (response: AiGatewayErrorResponse) => Error;
		},
		errorMessage = 'Gateway credits request failed',
	): Promise<T> {
		const response = await this.outboundHttp
			.requests({
				useDefaultSsrfPolicy: 'unsafe', // the gateway base URL is n8n-owned configuration
			})
			.request({
				method: options.method,
				url: options.url,
				...(options.headers ? { headers: options.headers } : {}),
				...(options.body !== undefined ? { body: options.body, json: true } : {}),
				...(options.disableFollowRedirect ? { disableFollowRedirect: true } : {}),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true, // A non-2xx status is surfaced as an error below
			});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw options.mapErrorResponse
				? options.mapErrorResponse({ statusCode: response.statusCode, body: response.body })
				: new UserError(`${errorMessage}: HTTP ${response.statusCode}`);
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
		const resolvedProjectId = await this.resolveProjectId({ projectId, workflowId });
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
	 * Resolves the concrete project a request belongs to: the explicit `projectId`
	 * when provided, otherwise the owning project of `workflowId` (cached lookup).
	 * Returns undefined when neither is available or workflow ownership cannot be
	 * resolved, so project attribution never blocks gateway credential creation.
	 */
	private async resolveProjectId({
		projectId,
		workflowId,
	}: {
		projectId: string | undefined;
		workflowId: string | undefined;
	}): Promise<string | undefined> {
		if (projectId) return projectId;
		if (!workflowId) return undefined;
		try {
			return (await this.ownershipService.getWorkflowProjectCached(workflowId)).id;
		} catch {
			return undefined;
		}
	}

	/**
	 * Returns a synthetic credential for the given type, pointing the node at the gateway
	 * instead of the real provider. Called from `CredentialsHelper.getDecrypted` when
	 * `nodeCredentials.__aiGatewayManaged` is set.
	 *
	 * `node` is optional — callers with no workflow node to check against (e.g.
	 * Agents) skip eligibility entirely. When provided, it's checked against
	 * `checkAiGatewayEligibility` before minting.
	 */
	async getSyntheticCredential({
		credentialType,
		userId,
		workflowId,
		projectId,
		executionId,
		agentId,
		node,
	}: {
		credentialType: string;
		userId: string | undefined;
		workflowId?: string;
		projectId?: string;
		executionId?: string;
		agentId?: string;
		node?: Pick<INode, 'type' | 'typeVersion' | 'parameters'>;
	}): Promise<ICredentialDataDecryptedObject> {
		if (!this.licenseState.isAiGatewayLicensed()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.AI_GATEWAY);
		}
		if (!this.isEnabled()) {
			throw new UserError('Gateway credits are not enabled on this instance.');
		}

		const baseUrl = this.requireBaseUrl();

		const config = await this.getGatewayConfig();
		const providerConfig = config.providerConfig[credentialType];
		if (!providerConfig) {
			throw new UserError(
				`Credential type "${credentialType}" is not supported by Gateway credits.`,
			);
		}

		if (node) {
			const eligibility = checkAiGatewayEligibility(node, credentialType, config);
			if (!eligibility.eligible) {
				throw new UserError(
					`Gateway credits eligibility check failed: ${eligibility.reason}${eligibility.details ? ` (${eligibility.details})` : ''}.`,
				);
			}
		}

		const resolvedProjectId = await this.resolveProjectId({ projectId, workflowId });
		const resolvedUserId = await this.resolveUserId({
			userId,
			projectId: resolvedProjectId,
			workflowId,
		});
		if (!resolvedUserId) {
			throw new UserError('Failed to resolve user for Gateway credits attribution.');
		}
		const jwt = await this.getOrFetchToken(resolvedUserId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid Gateway credits token.');
		}

		const urlFields = this.buildUrlFields(baseUrl, providerConfig, {
			executionId,
			workflowId,
			projectId: resolvedProjectId,
			agentId,
		});

		return {
			[providerConfig.apiKeyField]: jwt,
			...urlFields,
		};
	}

	/**
	 * Sends a request to a gateway provider on behalf of a signed-in user, with the user's
	 * gateway token in the `authHeaderKey` header. The URL is built here from `provider`
	 * and `path`, and redirects are not followed, so the token cannot reach another host.
	 * The URL carries the attribution as an exec context.
	 */
	async sendProviderRequest<T>({
		provider,
		authHeaderKey,
		method,
		path,
		body,
		userId,
		attribution,
		mapErrorResponse,
	}: {
		/** The gateway provider name, for example `browserbaseBrowserUse`. */
		provider: string;
		authHeaderKey: string;
		method: IHttpRequestMethods;
		/** The provider's own route, added after the provider's gateway URL, for example `/v1/sessions`. */
		path: string;
		body?: unknown;
		userId: string;
		attribution: AiGatewayRequestAttribution;
		mapErrorResponse?: (response: AiGatewayErrorResponse) => Error;
	}): Promise<T> {
		if (!AiGatewayService.PROVIDER_NAME_PATTERN.test(provider)) {
			throw new UnexpectedError('Invalid gateway provider name', { extra: { provider } });
		}
		this.assertEnabled();
		const baseUrl = this.requireBaseUrl();
		const token = await this.getOrFetchToken(userId);
		const gatewayPath = `${AiGatewayService.GATEWAY_PATH_PREFIX}/${provider}`;
		const url = this.buildGatewayUrl(baseUrl, gatewayPath, attribution);
		return await this.gatewayRequest<T>({
			method,
			url: `${url}${path}`,
			headers: { [authHeaderKey]: token },
			body,
			disableFollowRedirect: true,
			mapErrorResponse,
		});
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
		context: { executionId?: string; workflowId?: string; projectId?: string; agentId?: string },
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
			throw new UserError('Failed to obtain a valid Gateway credits token.');
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
			throw new UserError('Gateway credits returned an invalid usage response.');
		}
		return data;
	}

	/**
	 * Returns the current wallet (budget and remaining balance) for the given user.
	 */
	async getWallet(userId: string): Promise<AiGatewayWalletResponse> {
		const baseUrl = this.requireBaseUrl();

		const jwt = await this.getOrFetchToken(userId);
		if (!jwt) {
			throw new UserError('Failed to obtain a valid Gateway credits token.');
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

	private parseWalletResponse(data: unknown): AiGatewayWalletResponse {
		const d = data as { budget?: unknown; balance?: unknown; hasEverToppedUp?: unknown };
		if (typeof d.budget !== 'number' || typeof d.balance !== 'number') {
			throw new UserError('Gateway credits returned an invalid wallet response.');
		}
		return {
			budget: d.budget,
			balance: d.balance,
			hasEverToppedUp: d.hasEverToppedUp === true,
		};
	}

	/**
	 * Builds the gateway URL for a provider credential.
	 *
	 * When both `executionId` and `workflowId` are provided, embeds them as an
	 * `/exec/:executionId/:workflowId/` prefix inside the gateway path. The AI Gateway's
	 * URL-rewriting middleware strips this prefix before proxying upstream, so all SDK
	 * clients remain unaware of it while the gateway can record the IDs in usage metadata.
	 *
	 * When a `projectId` is available it is appended to the workflow path segment as a
	 * `|`-joined, encoded list (`:workflowId|:projectId`, the `|` percent-encoded), so the
	 * gateway can group usage by project. Omitting it keeps the `:workflowId`-only form.
	 *
	 * Agents have no execution or workflow. When an `agentId` is present (and no
	 * `workflowId`), the literal `agent` takes the execution segment and the agentId
	 * takes the workflow segment, so the gateway attributes usage to the agent.
	 *
	 * Example (OpenAI):
	 *   without context → `<base>/v1/gateway/openai/v1`
	 *   with context    → `<base>/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/openai/v1`
	 *   with project    → `<base>/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw%7Cnr6r2FfB0mVeqZP1/openai/v1`
	 *   agent           → `<base>/v1/gateway/exec/agent/AG123%7Cnr6r2FfB0mVeqZP1/openai/v1`
	 *
	 * Instance AI background tasks work the same way with the literal `instance-ai`,
	 * which also tells the gateway to bill Assistant credits. The thread and task take
	 * the workflow segment as `:threadId|:taskId`:
	 *   instance AI     → `<base>/v1/gateway/exec/instance-ai/THR123%7CTASK123/browserbaseBrowserUse`
	 */
	private buildGatewayUrl(
		baseUrl: string,
		gatewayPath: string,
		context: GatewayUrlContext,
	): string {
		const { execId, contextIds = [] } = this.resolveExecContext(context);
		if (!execId || !gatewayPath.startsWith(AiGatewayService.GATEWAY_PATH_PREFIX)) {
			return `${baseUrl}${gatewayPath}`;
		}
		const providerSuffix = gatewayPath.slice(AiGatewayService.GATEWAY_PATH_PREFIX.length);
		const execSegment = encodeURIComponent(execId);
		const contextSegment = encodeURIComponent(contextIds.filter(Boolean).join('|'));
		return `${baseUrl}${AiGatewayService.GATEWAY_PATH_PREFIX}/exec/${execSegment}/${contextSegment}${providerSuffix}`;
	}

	/**
	 * Returns the `execId` and `contextIds` when the request can be attributed.
	 * Otherwise returns an empty object.
	 */
	private resolveExecContext(context: GatewayUrlContext): {
		execId?: string;
		contextIds?: Array<string | undefined>;
	} {
		if (context.instanceAiThreadId) {
			return {
				execId: 'instance-ai',
				contextIds: [context.instanceAiThreadId, context.instanceAiTaskId],
			};
		}
		if (context.workflowId) {
			return {
				execId: context.executionId,
				contextIds: [context.workflowId, context.projectId],
			};
		}
		if (context.agentId) {
			return {
				execId: 'agent',
				contextIds: [context.agentId, context.projectId],
			};
		}
		return {};
	}

	private requireBaseUrl(): string {
		const url = this.globalConfig.aiAssistant.baseUrl;
		if (!url)
			throw new UserError('Gateway credits are not configured. Set the AI assistant base URL.');
		return url;
	}

	private isConfigStale(): boolean {
		return (
			this.gatewayConfig === null ||
			Date.now() - this.configFetchedAt > AiGatewayService.CONFIG_TTL_MS
		);
	}

	/**
	 * Returns `{ available: true, config }` when n8n Connect is enabled, licensed,
	 * and its config fetches successfully; `{ available: false }` otherwise.
	 * Never propagates gateway or config errors.
	 */
	async isAvailable(): Promise<AiGatewayAvailability> {
		if (!this.isEnabled()) return { available: false };
		try {
			const config = await this.getGatewayConfig();
			return { available: true, config };
		} catch {
			return { available: false };
		}
	}

	async getGatewayConfig(): Promise<AiGatewayConfigDto> {
		if (!this.isConfigStale()) return this.gatewayConfig!;

		// Throttle re-fetching after a recent failure so a down gateway isn't hit on every call.
		if (
			this.configFetchFailedAt > 0 &&
			Date.now() - this.configFetchFailedAt < AiGatewayService.CONFIG_FAILURE_TTL_MS
		) {
			throw new OperationalError(
				'Gateway credits config fetch recently failed; retry is throttled.',
			);
		}

		const baseUrl = this.requireBaseUrl();

		try {
			const data = await this.gatewayRequest<unknown>(
				{
					method: 'GET',
					url: `${baseUrl}/v1/gateway/config`,
				},
				'Failed to fetch AI Gateway config',
			);
			const parsed = AiGatewayConfigDto.safeParse(data);
			if (!parsed.success) {
				throw new UserError('Gateway credits returned an invalid config response.');
			}

			this.gatewayConfig = parsed.data;
			this.configFetchedAt = Date.now();
			this.configFetchFailedAt = 0;
			return parsed.data;
		} catch (error) {
			this.configFetchFailedAt = Date.now();
			throw error;
		}
	}

	/**
	 * Resolves the n8n credential type the gateway serves for a model-provider
	 * prefix (e.g. `openai` → `openAiApi`). Returns `undefined` when n8n Connect
	 * is unlicensed or the gateway does not serve that provider. This is the
	 * authoritative n8n Connect provider → credential-type support gate.
	 */
	async getCredentialTypeForProvider(provider: string): Promise<string | undefined> {
		if (!this.isEnabled()) return undefined;
		const config = await this.getGatewayConfig();
		return AiGatewayService.matchCredentialTypeForProvider(config, provider);
	}

	/**
	 * Cache-only counterpart to {@link getCredentialTypeForProvider}, for the
	 * static agent validator which must never trigger a network fetch. Returns:
	 *  - the credential type when the cached config serves the provider,
	 *  - `null` when support is definitively unavailable (unlicensed, or the
	 *    cached config does not serve the provider) — a real "gateway says no",
	 *  - `undefined` when it can't be determined (no config cached yet) — a
	 *    "could not ask", so callers must not fail closed on it.
	 *
	 * Uses the last cached config even if past its refresh TTL: a slightly stale
	 * answer is preferable to a network call here.
	 */
	getCredentialTypeForProviderCached(provider: string): string | null | undefined {
		if (!this.isEnabled()) return null;
		if (!this.gatewayConfig) return undefined;
		return AiGatewayService.matchCredentialTypeForProvider(this.gatewayConfig, provider) ?? null;
	}

	/**
	 * Matches a model-provider prefix (e.g. `openai`) to the n8n credential type
	 * the gateway serves it under: the provider's credential types, in preference
	 * order, filtered to those the gateway holds a `providerConfig` entry for (the
	 * same entry `getSyntheticCredential` needs to mint a credential). Returns
	 * `undefined` when the gateway does not serve it.
	 *
	 * Deliberately not derived from `gatewayPath`: that made the mapping depend on
	 * the gateway's URL slugs happening to equal n8n's own provider ids, which
	 * they need not (e.g. Moonshot serves Kimi under the `moonshot` slug).
	 */
	private static matchCredentialTypeForProvider(
		config: AiGatewayConfigDto,
		provider: string,
	): string | undefined {
		return getAgentModelProviderCredentialTypes(provider).find(
			(credentialType) => config.providerConfig[credentialType] !== undefined,
		);
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
			throw new UserError('Gateway credits returned an invalid token response.');
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

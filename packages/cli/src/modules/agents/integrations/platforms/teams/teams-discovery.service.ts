import type { TeamsDiscoveryState } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';

import { CredentialsService } from '@/credentials/credentials.service';
import { CacheService } from '@/services/cache/cache.service';

import { stringProperty } from '../../integration-helpers';

/**
 * Long enough for someone to switch to the Azure portal, open Test in Web Chat
 * and send a message; short enough that the endpoint is not left listening.
 */
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

const BOT_FRAMEWORK_ISSUER = 'https://api.botframework.com';
const BOT_FRAMEWORK_JWKS_URL = 'https://login.botframework.com/v1/.well-known/keys';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

const TEAMS_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

interface AgentScope {
	projectId: string;
	agentId: string;
}

/** What is stored while the window is open. Never holds a secret. */
interface StoredDiscovery {
	clientId?: string;
	tenantId?: string;
}

const cacheKey = ({ projectId, agentId }: AgentScope) => `teams-discovery:${projectId}:${agentId}`;

@Service()
export class TeamsDiscoveryService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly credentialsService: CredentialsService,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	/** Opens the window. Only an authenticated user on the agent reaches this. */
	async open(scope: AgentScope): Promise<void> {
		await this.cacheService.set(cacheKey(scope), JSON.stringify({}), DISCOVERY_TTL_MS);
	}

	async close(scope: AgentScope): Promise<void> {
		await this.cacheService.delete(cacheKey(scope));
	}

	async getState(scope: AgentScope): Promise<TeamsDiscoveryState> {
		const stored = await this.read(scope);
		if (!stored) return { status: 'expired' };
		if (!stored.clientId) return { status: 'waiting' };

		return {
			status: 'found',
			clientId: stored.clientId,
			tenantId: stored.tenantId ?? null,
			existingCredentialId: await this.findMatchingCredential(
				scope.projectId,
				stored.clientId,
				stored.tenantId,
			),
		};
	}

	/**
	 * Records the bot behind an inbound activity, if a window is open for this
	 * agent.
	 *
	 * The token is verified rather than trusted, because this step's whole claim
	 * is that real Bot Framework traffic is reaching the endpoint. An unverified
	 * body would let any POST satisfy it, and the setup would report a working
	 * endpoint that is not working.
	 *
	 * What it records — the Application (client) ID and the tenant — are public
	 * identifiers that ship inside the manifest. The bot still cannot act until
	 * the user supplies the client secret, so this pre-fills a form rather than
	 * granting anything.
	 */
	async record(
		scope: AgentScope,
		headers: Readonly<Record<string, string | string[] | undefined>>,
		body: unknown,
	): Promise<boolean> {
		const stored = await this.read(scope);
		if (!stored) return false;

		const token = this.bearerToken(headers);
		if (!token) return false;

		const clientId = await this.verifiedClientId(token);
		if (!clientId) return false;

		await this.cacheService.set(
			cacheKey(scope),
			JSON.stringify({
				clientId,
				...(this.tenantIdFrom(body) ? { tenantId: this.tenantIdFrom(body) } : {}),
			}),
			DISCOVERY_TTL_MS,
		);
		return true;
	}

	private async read(scope: AgentScope): Promise<StoredDiscovery | undefined> {
		const raw = await this.cacheService.get<string>(cacheKey(scope));
		if (typeof raw !== 'string') return undefined;
		try {
			const parsed: unknown = JSON.parse(raw);
			return isRecord(parsed) ? parsed : {};
		} catch {
			return {};
		}
	}

	private bearerToken(
		headers: Readonly<Record<string, string | string[] | undefined>>,
	): string | undefined {
		const raw = headers.authorization ?? headers.Authorization;
		const value = Array.isArray(raw) ? raw[0] : raw;
		if (typeof value !== 'string') return undefined;
		const [scheme, token] = value.split(' ');
		return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
	}

	/** The verified token's audience is the bot's Application (client) ID. */
	private async verifiedClientId(token: string): Promise<string | undefined> {
		try {
			const jwks = createLocalJWKSet(await this.botFrameworkKeys());
			const { payload } = await jwtVerify(token, jwks, { issuer: BOT_FRAMEWORK_ISSUER });
			const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
			return typeof audience === 'string' && audience ? audience : undefined;
		} catch (error) {
			this.logger.debug('[TeamsDiscovery] Could not verify the Bot Framework token', { error });
			return undefined;
		}
	}

	private async botFrameworkKeys(): Promise<JSONWebKeySet> {
		const cached = await this.cacheService.get<string>(BOT_FRAMEWORK_JWKS_URL);
		if (typeof cached === 'string') {
			return JSON.parse(cached) as JSONWebKeySet;
		}

		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({ method: 'GET', url: BOT_FRAMEWORK_JWKS_URL, returnFullResponse: true });

		const keys = response.body as JSONWebKeySet;
		await this.cacheService.set(BOT_FRAMEWORK_JWKS_URL, JSON.stringify(keys), JWKS_CACHE_TTL_MS);
		return keys;
	}

	/** Teams sends a tenant; Web Chat does not, which is why this may be absent. */
	private tenantIdFrom(body: unknown): string | undefined {
		if (!isRecord(body)) return undefined;
		const channelData = isRecord(body.channelData) ? body.channelData : undefined;
		const tenant = channelData && isRecord(channelData.tenant) ? channelData.tenant : undefined;
		const conversation = isRecord(body.conversation) ? body.conversation : undefined;
		return stringProperty(tenant, 'id') ?? stringProperty(conversation, 'tenantId');
	}

	private async findMatchingCredential(
		projectId: string,
		clientId: string,
		tenantId: string | undefined,
	): Promise<string | null> {
		const candidates = await this.credentialsService.findAllCredentialIdsForProject(projectId);
		for (const candidate of candidates) {
			if (candidate.type !== TEAMS_CREDENTIAL_TYPE) continue;
			const data = await this.credentialsService.decrypt(candidate, true);
			if (stringProperty(data, 'clientId') !== clientId) continue;
			if (tenantId && stringProperty(data, 'tenantId') !== tenantId) continue;
			return candidate.id;
		}
		return null;
	}
}

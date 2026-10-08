import { randomUUID } from 'node:crypto';

import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { JwtService } from '@/services/jwt.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { SandboxPortCapability } from './sandbox-port-capability.service';

export const SANDBOX_PREVIEW_PATH_PREFIX = '/sandbox-preview';

/** The preview URL is a bearer credential, so it is valid for one hour at most. */
export const SANDBOX_PREVIEW_TTL_SECONDS = 60 * 60;

/** A live preview URL is given out again while at least this much of its life is left. */
const REUSE_MIN_REMAINING_MS = (SANDBOX_PREVIEW_TTL_SECONDS * 1000) / 2;

/**
 * How long the proxy reuses the sandbox service settings, so that a rotated
 * key or a changed URL reaches open previews soon.
 */
const SERVICE_CONFIG_CACHE_MS = 30_000;

interface ServiceConfig {
	serviceUrl?: string;
	apiKey?: string;
}

/** The form of a service URL in a port route: no spaces, no trailing slash (see `getPortRoute`). */
export const normalizeServiceUrl = (url: string | undefined): string | undefined =>
	url?.trim().replace(/\/+$/, '') || undefined;

const tokenClaimsSchema = z.object({ sub: z.string().min(1), jti: z.string().min(1) });

/** One preview URL and the sandbox port that it reaches. */
export interface SandboxPreviewEntry {
	jti: string;
	token: string;
	/** The user the URL was made for. */
	userId: string;
	/** The project whose `agent:execute` scope the viewer must keep. */
	projectId: string;
	/** Entries with the same scope are interchangeable. */
	scope: string;
	serviceUrl: string;
	/** `/sandboxes/<id>/ports/<port>` on the service. */
	path: string;
	/** Epoch milliseconds; the same instant as the token's `exp`. */
	expiresAt: number;
}

export interface SandboxPreviewRequest {
	userId: string;
	projectId: string;
	port: number;
}

/**
 * Makes n8n URLs that show an app which runs on a port of an n8n sandbox
 * service sandbox. The entries live in the memory of this process, so a
 * preview works only on the main that made it (single-main setups).
 */
@Service()
export class SandboxPreviewService {
	private readonly entries = new Map<string, SandboxPreviewEntry>();

	private configCache?: { config: Promise<ServiceConfig>; until: number };

	constructor(
		private readonly jwtService: JwtService,
		private readonly sandboxSettingsService: SandboxSettingsService,
		private readonly portCapability: SandboxPortCapability,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Returns the n8n URL of the preview, `<N8N_PATH>sandbox-preview/<token>/`. */
	async open(sandbox: WorkspaceSandbox, request: SandboxPreviewRequest): Promise<{ url: string }> {
		const route = await this.portCapability.resolveRoute(sandbox, request.port);
		this.pruneExpired();
		const scope = JSON.stringify([request.userId, request.projectId, route.serviceUrl, route.path]);
		const entry = this.reusableEntry(scope) ?? this.createEntry(request, route, scope);
		const basePath = this.globalConfig.path.replace(/\/+$/, '');
		return { url: `${basePath}${SANDBOX_PREVIEW_PATH_PREFIX}/${entry.token}/` };
	}

	/**
	 * The entry a token names, or undefined when the token is bad, expired or
	 * revoked. The token expires at the same instant as its entry, so the
	 * token check also refuses an expired entry; `open` removes those.
	 */
	resolveToken(token: string): SandboxPreviewEntry | undefined {
		const claims = this.verify(token);
		if (!claims) return undefined;
		const entry = this.entries.get(claims.jti);
		return entry?.userId === claims.sub ? entry : undefined;
	}

	/** The sandbox restarted, or the user lost access; the next `open` makes a new URL. */
	markDead(entry: SandboxPreviewEntry): void {
		if (this.entries.get(entry.jti) === entry) this.entries.delete(entry.jti);
	}

	/**
	 * The API key for a request of `entry`, read for each request so that open
	 * previews keep working after an admin rotates the key. The key belongs to
	 * the configured service URL and never goes to another one. When the agent
	 * sandbox is off, uses another provider, or names another service URL than
	 * the entry, this revokes the entry and returns undefined.
	 */
	async serviceCredentials(entry: SandboxPreviewEntry): Promise<{ apiKey?: string } | undefined> {
		const config = this.servesN8nSandbox() ? await this.currentServiceConfig() : undefined;
		if (config && normalizeServiceUrl(config.serviceUrl) === entry.serviceUrl) {
			return { apiKey: config.apiKey };
		}
		this.markDead(entry);
		return undefined;
	}

	private servesN8nSandbox(): boolean {
		return (
			this.sandboxSettingsService.isAgentSandboxEnabled() &&
			this.sandboxSettingsService.getProvider() === 'n8n-sandbox'
		);
	}

	/** The URL and the key come from one read, so a cached pair always belongs together. */
	private async currentServiceConfig(): Promise<ServiceConfig> {
		const now = Date.now();
		if (!this.configCache || this.configCache.until <= now) {
			const config = this.sandboxSettingsService.resolveN8nSandboxConfig();
			const cache = { config, until: now + SERVICE_CONFIG_CACHE_MS };
			this.configCache = cache;
			// A failed read is not reused.
			void config.catch(() => {
				if (this.configCache === cache) this.configCache = undefined;
			});
		}
		return await this.configCache.config;
	}

	private reusableEntry(scope: string): SandboxPreviewEntry | undefined {
		const reusableUntil = Date.now() + REUSE_MIN_REMAINING_MS;
		for (const entry of this.entries.values()) {
			if (entry.scope === scope && entry.expiresAt >= reusableUntil) return entry;
		}
		return undefined;
	}

	private createEntry(
		request: SandboxPreviewRequest,
		route: SandboxPortRoute,
		scope: string,
	): SandboxPreviewEntry {
		const jti = randomUUID();
		// An explicit `iat` makes the entry expire at the same second as the token.
		const issuedAt = Math.floor(Date.now() / 1000);
		const token = this.jwtService.sign(
			'sandboxPreview',
			{ sub: request.userId, jti, iat: issuedAt },
			{ expiresIn: SANDBOX_PREVIEW_TTL_SECONDS },
		);
		const entry: SandboxPreviewEntry = {
			jti,
			token,
			userId: request.userId,
			projectId: request.projectId,
			scope,
			serviceUrl: route.serviceUrl,
			path: route.path,
			expiresAt: (issuedAt + SANDBOX_PREVIEW_TTL_SECONDS) * 1000,
		};
		this.entries.set(jti, entry);
		return entry;
	}

	private pruneExpired(): void {
		const now = Date.now();
		for (const [jti, entry] of this.entries) {
			if (entry.expiresAt <= now) this.entries.delete(jti);
		}
	}

	private verify(token: string): z.infer<typeof tokenClaimsSchema> | undefined {
		try {
			const parsed = tokenClaimsSchema.safeParse(
				this.jwtService.verify<unknown>('sandboxPreview', token),
			);
			return parsed.success ? parsed.data : undefined;
		} catch {
			return undefined;
		}
	}
}

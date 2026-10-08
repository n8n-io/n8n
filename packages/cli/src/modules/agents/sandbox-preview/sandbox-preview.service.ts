import { randomUUID } from 'node:crypto';

import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { z } from 'zod';

import { JwtService } from '@/services/jwt.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { SandboxPortCapability } from './sandbox-port-capability.service';

export const SANDBOX_PREVIEW_PATH_PREFIX = '/sandbox-preview';

/** The preview URL is a bearer credential, so it is valid for one hour at most. */
export const SANDBOX_PREVIEW_TTL_SECONDS = 60 * 60;

/** A live preview URL is given out again while at least this much of its life is left. */
const REUSE_MIN_REMAINING_MS = (SANDBOX_PREVIEW_TTL_SECONDS * 1000) / 2;

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
	apiKey?: string;
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

	constructor(
		private readonly jwtService: JwtService,
		private readonly sandboxSettingsService: SandboxSettingsService,
		private readonly portCapability: SandboxPortCapability,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Returns the n8n URL of the preview, `<N8N_PATH>sandbox-preview/<token>/`. */
	async open(sandbox: WorkspaceSandbox, request: SandboxPreviewRequest): Promise<{ url: string }> {
		if (!sandbox.getPortRoute) {
			throw new BadRequestError('This sandbox cannot show app previews');
		}
		const route = await sandbox.getPortRoute(request.port);
		await this.portCapability.assertSupported(route.serviceUrl);
		this.pruneExpired();
		const scope = JSON.stringify([request.userId, request.projectId, route.serviceUrl, route.path]);
		const entry = this.reusableEntry(scope) ?? (await this.createEntry(request, route, scope));
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

	/** The sandbox restarted, and the app on the port with it; the next `open` makes a new URL. */
	markDead(entry: SandboxPreviewEntry): void {
		if (this.entries.get(entry.jti) === entry) this.entries.delete(entry.jti);
	}

	private reusableEntry(scope: string): SandboxPreviewEntry | undefined {
		const reusableUntil = Date.now() + REUSE_MIN_REMAINING_MS;
		for (const entry of this.entries.values()) {
			if (entry.scope === scope && entry.expiresAt >= reusableUntil) return entry;
		}
		return undefined;
	}

	private async createEntry(
		request: SandboxPreviewRequest,
		route: SandboxPortRoute,
		scope: string,
	): Promise<SandboxPreviewEntry> {
		const { apiKey } = await this.sandboxSettingsService.resolveN8nSandboxConfig();
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
			apiKey,
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

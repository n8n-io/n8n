import { Service } from '@n8n/di';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/services/cache/cache.service';
import { JwtService } from '@/services/jwt.service';

/** `published` serves the active version; `draft` (editor preview) the current Page rows. */
const accessModeSchema = z.enum(['published', 'draft']);
export type AppAccessMode = z.infer<typeof accessModeSchema>;

/** Who a code or refresh token stands for. `sessionToken` is the raw n8n auth cookie
 * captured at navigation; a refresh re-validates it so an n8n logout ends the app session. */
export type AppSessionRecord = {
	appId: string;
	viewerId: string | null;
	sessionToken: string | null;
	mode?: AppAccessMode;
};

const accessPayloadSchema = z.object({
	kind: z.literal('app-access'),
	appId: z.string().min(1),
	viewerId: z.string().nullable(),
	mode: accessModeSchema.default('published'),
});

export type AppAccessPayload = Omit<z.infer<typeof accessPayloadSchema>, 'kind'>;

export type AppTokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

const CODE_TTL_MS = 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TTL_SECONDS = Number(process.env.N8N_APPS_ACCESS_TOKEN_TTL) || 10 * 60;

export const bearerToken = (req: Request): string | undefined => {
	const authorization = req.headers.authorization;
	return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
};

/**
 * OAuth2-style tokens for a served App page: a one-time code travels in the
 * redirect URL, the page script exchanges it for an access token (JWT, short)
 * plus a refresh token (random, rotated on use). Codes and refresh tokens live
 * in the cache; nothing is embedded in the HTML.
 */
@Service()
export class AppTokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly cacheService: CacheService,
		private readonly authService: AuthService,
	) {}

	async issueCode(record: AppSessionRecord): Promise<string> {
		const code = randomBytes(32).toString('hex');
		await this.cacheService.set(`apps:code:${code}`, record, CODE_TTL_MS);
		return code;
	}

	async exchangeCode(code: string): Promise<AppTokenPair | null> {
		const record = await this.cacheService.take<AppSessionRecord>(`apps:code:${code}`);
		return record ? await this.issuePair(record) : null;
	}

	async refresh(refreshToken: string): Promise<AppTokenPair | null> {
		const record = await this.cacheService.take<AppSessionRecord>(`apps:refresh:${refreshToken}`);
		if (!record) return null;
		if (record.sessionToken) {
			try {
				await this.authService.validateCookieToken(record.sessionToken);
			} catch {
				return null;
			}
		}
		return await this.issuePair(record);
	}

	verifyAccess(token: string): AppAccessPayload | null {
		let decoded: unknown;
		try {
			decoded = this.jwtService.verify(token);
		} catch {
			return null;
		}
		const parsed = accessPayloadSchema.safeParse(decoded);
		if (!parsed.success) return null;
		const { appId, viewerId, mode } = parsed.data;
		return { appId, viewerId, mode };
	}

	private async issuePair(record: AppSessionRecord): Promise<AppTokenPair> {
		const refreshToken = randomBytes(32).toString('hex');
		await this.cacheService.set(`apps:refresh:${refreshToken}`, record, REFRESH_TTL_MS);
		const accessToken = this.jwtService.sign(
			{
				kind: 'app-access',
				appId: record.appId,
				viewerId: record.viewerId,
				mode: record.mode ?? 'published',
			},
			{ expiresIn: ACCESS_TTL_SECONDS },
		);
		return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
	}
}

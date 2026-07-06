import type { LoginSession } from '@n8n/api-types';
import type { UserLoginSession } from '@n8n/db';
import { UserLoginSessionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

export type CreateLoginSessionData = {
	userId: string;
	jti: string;
	browserIdHash: string | null;
	userAgent: string | null;
	ipAddress: string | null;
	expiresAt: Date;
};

/** Only rewrite `lastActiveAt` once it's this stale, so the per-request touch is mostly a no-op. */
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Owns the lifecycle of persisted browser/device login sessions: creation on
 * login, enforcement on each request, and revocation. The session's row is the
 * source of truth — removing it invalidates the matching JWT on its next use.
 */
@Service()
export class LoginSessionService {
	constructor(private readonly loginSessionRepository: UserLoginSessionRepository) {}

	async create(data: CreateLoginSessionData): Promise<void> {
		await this.loginSessionRepository.insert({
			id: data.jti,
			userId: data.userId,
			browserIdHash: data.browserIdHash,
			userAgent: data.userAgent?.slice(0, 512) ?? null,
			ipAddress: data.ipAddress?.slice(0, 45) ?? null,
			expiresAt: data.expiresAt,
			lastActiveAt: new Date(),
		});
	}

	/**
	 * On JWT refresh the token's expiry rolls forward, so the row's `expiresAt`
	 * must follow — otherwise prune-on-read would delete an actively-refreshing
	 * session at its original expiry and log the user out.
	 */
	async refreshExpiry(jti: string, expiresAt: Date): Promise<void> {
		await this.loginSessionRepository.update({ id: jti }, { expiresAt, lastActiveAt: new Date() });
	}

	/**
	 * Bumps `lastActiveAt`, but only once it's gone stale, so it can run on every
	 * authenticated request. The throttle is the `WHERE` clause — a no-op write
	 * within the window — so no per-instance state is needed.
	 */
	async touchIfStale(jti: string): Promise<void> {
		// ponytail: throttle is the repo's WHERE clause — one conditional UPDATE
		// per request, no per-instance state. Add an in-memory skip only if hot.
		await this.loginSessionRepository.touchLastActive(
			jti,
			new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS),
		);
	}

	/** Whether a session is still live. A missing row means logged out or revoked. */
	async isActive(jti: string): Promise<boolean> {
		return await this.loginSessionRepository.existsBy({ id: jti });
	}

	async remove(jti: string): Promise<void> {
		await this.loginSessionRepository.delete({ id: jti });
	}

	async listForUser(userId: string, currentJti?: string): Promise<LoginSession[]> {
		const sessions = await this.loginSessionRepository.findActiveByUser(userId);
		return sessions.map((session) => this.toDto(session, currentJti));
	}

	async revokeForUser(userId: string, id: string): Promise<void> {
		const removed = await this.loginSessionRepository.deleteByIdForUser(id, userId);
		if (removed === 0) {
			throw new NotFoundError('Login session not found');
		}
	}

	async revokeAllOthers(userId: string, currentJti: string): Promise<number> {
		return await this.loginSessionRepository.deleteAllForUserExcept(userId, currentJti);
	}

	private toDto(session: UserLoginSession, currentJti?: string): LoginSession {
		return {
			id: session.id,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			current: session.id === currentJti,
			lastActiveAt: session.lastActiveAt?.toISOString() ?? null,
			createdAt: session.createdAt.toISOString(),
		};
	}
}

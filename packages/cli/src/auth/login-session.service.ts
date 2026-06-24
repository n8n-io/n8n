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

	/** Bumps last-active. Called from the JWT-refresh branch, so it's already infrequent. */
	async touch(jti: string): Promise<void> {
		await this.loginSessionRepository.update({ id: jti }, { lastActiveAt: new Date() });
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
			expiresAt: session.expiresAt.toISOString(),
		};
	}
}

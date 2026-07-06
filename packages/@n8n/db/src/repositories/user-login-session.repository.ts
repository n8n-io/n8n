import { Service } from '@n8n/di';
import { DataSource, LessThan, LessThanOrEqual, Not, Repository } from '@n8n/typeorm';

import { UserLoginSession } from '../entities';

@Service()
export class UserLoginSessionRepository extends Repository<UserLoginSession> {
	constructor(dataSource: DataSource) {
		super(UserLoginSession, dataSource.manager);
	}

	/**
	 * Active sessions for a user, newest activity first. Prunes the user's
	 * expired rows on the way (we have no scheduled cleanup by design).
	 */
	async findActiveByUser(userId: string, now = new Date()): Promise<UserLoginSession[]> {
		await this.delete({ userId, expiresAt: LessThanOrEqual(now) });
		return await this.find({
			where: { userId },
			order: { lastActiveAt: 'DESC', createdAt: 'DESC' },
		});
	}

	/** Bumps `lastActiveAt` only when it's older than `staleBefore`, so per-request calls are mostly no-ops. */
	async touchLastActive(jti: string, staleBefore: Date): Promise<void> {
		await this.update(
			{ id: jti, lastActiveAt: LessThan(staleBefore) },
			{ lastActiveAt: new Date() },
		);
	}

	/** Scoped delete; returns the number of rows removed so callers can detect a 404. */
	async deleteByIdForUser(id: string, userId: string): Promise<number> {
		const result = await this.delete({ id, userId });
		return result.affected ?? 0;
	}

	/** Revokes every session for the user except the one to keep; returns the count removed. */
	async deleteAllForUserExcept(userId: string, keepId: string): Promise<number> {
		const result = await this.delete({ userId, id: Not(keepId) });
		return result.affected ?? 0;
	}
}

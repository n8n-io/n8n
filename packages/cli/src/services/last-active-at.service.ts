import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { NextFunction, Response } from 'express';

import { Time } from '@/constants';
import type { AuthenticatedRequest } from '@/requests';

const LAST_ACTIVE_CACHE_TTL = 12 * Time.hours.toMilliseconds;

@Service()
export class LastActiveAtService {
	private readonly lastActiveCache = new Map<string, number>();

	constructor(
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {}

	async middleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (req.user) {
			res.on('finish', async () => {
				try {
					await this.updateLastActiveIfStale(req.user.id);
				} catch (error: unknown) {
					this.logger.error('Failed to update last active timestamp', { error });
				}
			});
			next();
		} else res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}

	async updateLastActiveIfStale(userId: string) {
		const now = Date.now();
		const last = this.lastActiveCache.get(userId) ?? 0;
		if (now - last > LAST_ACTIVE_CACHE_TTL) {
			const query = this.userRepository
				.createQueryBuilder()
				.update()
				.set({ lastActiveAt: new Date() })
				.where('id = :id', { id: userId });
			await query.execute();
			this.lastActiveCache.set(userId, now);
		}
	}
}

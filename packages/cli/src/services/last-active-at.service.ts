import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { NextFunction, Response } from 'express';
import { DateTime } from 'luxon';

@Service()
export class LastActiveAtService {
	private readonly lastActiveCache = new Map<string, string>();

	constructor(
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {}

	async middleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
		if (req.user) {
			this.updateLastActiveIfStale(req.user.id).catch((error: unknown) => {
				this.logger.error('Failed to update last active timestamp', { error });
			});
		}
		next();
	}

	async updateLastActiveIfStale(userId: string) {
		const now = DateTime.now().startOf('day');
		const dateNow = now.toISODate();
		const last = this.lastActiveCache.get(userId);

		// Update if date changed (or not set)
		if (!last || last !== dateNow) {
			await this.userRepository
				.createQueryBuilder()
				.update()
				.set({ lastActiveAt: now.toJSDate() })
				.where('id = :id', { id: userId })
				.execute();

			this.lastActiveCache.set(userId, dateNow);
		}
	}
}

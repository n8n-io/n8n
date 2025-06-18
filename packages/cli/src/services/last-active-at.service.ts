import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { Time } from '@/constants';

const LAST_ACTIVE_CACHE_TTL = 2 * Time.minutes.toMilliseconds;

@Service()
export class LastActiveAtService {
	private readonly lastActiveCache = new Map<string, number>();

	constructor(private readonly userRepository: UserRepository) {}

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

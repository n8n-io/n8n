import { UserRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { Time } from '@/constants';

const LAST_ACTIVE_CACHE_TTL = 2 * Time.minutes.toMilliseconds;

@Service()
export class LastActiveAtService {
	private readonly lastActiveCache = new Map<string, number>();

	constructor(private readonly userRepository: UserRepository) {}

	async updateLastActiveIfStale(user: User) {
		const now = Date.now();
		const last = this.lastActiveCache.get(user.id) ?? 0;
		if (now - last > LAST_ACTIVE_CACHE_TTL) {
			user.lastActiveAt = new Date();
			await this.userRepository.save(user);
			this.lastActiveCache.set(user.id, now);
		}
	}
}

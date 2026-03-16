import { ClockRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Provides an approximation of the DB server's current time.
 *
 * Fetches from the DB at most once every 60s and approximates intermediate
 * values by adding elapsed local wall-clock time since the last fetch.
 */
@Service()
export class DbClock {
	private cache: { serverTime: Date; localTimeAtFetch: number } | null = null;

	constructor(private readonly clockRepository: ClockRepository) {}

	async getApproximateServerTime(): Promise<Date> {
		const nowMs = Date.now();
		if (this.cache !== null && nowMs - this.cache.localTimeAtFetch < 60_000) {
			const elapsed = nowMs - this.cache.localTimeAtFetch;
			return new Date(this.cache.serverTime.getTime() + elapsed);
		}
		const serverTime = await this.clockRepository.getServerTime();
		this.cache = { serverTime, localTimeAtFetch: nowMs };
		return serverTime;
	}

	resetCache() {
		this.cache = null;
	}
}

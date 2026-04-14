import { ClockRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Provides an approximation of the DB server's current time.
 *
 * Fetches from the DB at most once every 60s and approximates intermediate
 * values by adding elapsed local wall-clock time since the last query.
 * Compensates for query round-trip time using NTP-style half-RTT offset.
 */
@Service()
export class DbClock {
	private cache: { dbTime: Date; localTimeAtQuery: number } | null = null;

	constructor(private readonly clockRepository: ClockRepository) {}

	async getApproximateDbTime(): Promise<Date> {
		const nowMs = Date.now();
		if (!this.isCacheStale(nowMs)) {
			const elapsed = nowMs - this.cache!.localTimeAtQuery;
			return new Date(this.cache!.dbTime.getTime() + elapsed);
		}
		const beforeMs = Date.now();
		const dbTime = await this.clockRepository.getDbTime();
		const afterMs = Date.now();
		const halfRtt = (afterMs - beforeMs) / 2;
		this.setCache(new Date(dbTime.getTime() + halfRtt), afterMs);
		return this.cache!.dbTime;
	}

	resetCache() {
		this.cache = null;
	}

	private isCacheStale(nowMs: number): boolean {
		return this.cache === null || nowMs - this.cache.localTimeAtQuery >= 60_000;
	}

	private setCache(dbTime: Date, localTimeAtQuery: number) {
		this.cache = { dbTime, localTimeAtQuery };
	}
}

import { Time } from '@n8n/constants';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';

const IDLE_TIMEOUT_MS = 30 * Time.minutes.toMilliseconds;
const SWEEP_INTERVAL_MS = 5 * Time.minutes.toMilliseconds;

function deriveThreadId(
	teamId: string,
	channelId: string,
	threadTs: string,
	userId: string,
): string {
	const digest = createHash('sha256')
		.update(`${teamId}:${channelId}:${threadTs}:${userId}`)
		.digest();
	const bytes = digest.subarray(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString('hex');
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32),
	].join('-');
}

@Service()
export class SlackThreadRegistry {
	private readonly lastTouchedAt = new Map<string, number>();

	private readonly sweepInterval: NodeJS.Timeout;

	constructor() {
		this.sweepInterval = setInterval(() => this.sweepIdle(), SWEEP_INTERVAL_MS);
		this.sweepInterval.unref();
	}

	isSubscribed(threadTs: string): boolean {
		return this.lastTouchedAt.has(threadTs);
	}

	subscribe(threadTs: string): void {
		this.lastTouchedAt.set(threadTs, Date.now());
	}

	unsubscribe(threadTs: string): void {
		this.lastTouchedAt.delete(threadTs);
	}

	threadIdFor(teamId: string, channelId: string, threadTs: string, userId: string): string {
		return deriveThreadId(teamId, channelId, threadTs, userId);
	}

	@OnShutdown()
	shutdown(): void {
		clearInterval(this.sweepInterval);
	}

	private sweepIdle(): void {
		const now = Date.now();
		for (const [threadTs, touchedAt] of this.lastTouchedAt) {
			if (now - touchedAt > IDLE_TIMEOUT_MS) {
				this.lastTouchedAt.delete(threadTs);
			}
		}
	}
}

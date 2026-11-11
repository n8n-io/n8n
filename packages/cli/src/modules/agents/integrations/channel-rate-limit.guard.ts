import { Service } from '@n8n/di';

import { CHANNEL_RATE_LIMIT_COOLDOWN_MS } from './channel-rate-limit';

@Service()
export class ChannelRateLimitGuard {
	private readonly blockedUntilMs = new Map<string, number>();

	isBlocked(connectionId: string, nowMs = Date.now()): boolean {
		if (!connectionId) return false;
		const until = this.blockedUntilMs.get(connectionId);
		if (until === undefined) return false;
		if (nowMs >= until) {
			this.blockedUntilMs.delete(connectionId);
			return false;
		}
		return true;
	}

	record(connectionId: string, nowMs = Date.now()): void {
		if (!connectionId) return;
		const until = nowMs + CHANNEL_RATE_LIMIT_COOLDOWN_MS;
		const existing = this.blockedUntilMs.get(connectionId) ?? 0;
		this.blockedUntilMs.set(connectionId, Math.max(until, existing));
	}
}

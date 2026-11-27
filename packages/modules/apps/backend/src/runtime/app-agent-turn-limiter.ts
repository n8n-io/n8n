import { Service } from '@n8n/di';

import { AppsConfig } from '../apps.config';
import { AppRuntimeError } from '../bindings/app-runtime.error';

const HOUR_MS = 60 * 60 * 1000;

interface TurnWindow {
	resetAt: number;
	count: number;
}

/**
 * Limits app agent chat turns for each main process. A visitor is one user of
 * one app, so a new session ID does not reset the visitor's limits.
 */
@Service()
export class AppAgentTurnLimiter {
	private inFlight = 0;

	private readonly inFlightByVisitor = new Map<string, number>();

	private readonly windows = new Map<string, TurnWindow>();

	private nextSweepAt = 0;

	constructor(private readonly config: AppsConfig) {}

	/**
	 * Claims a turn slot for the visitor, or throws a 429 error.
	 * Returns a release function. Calling it more than once frees the slot once.
	 */
	claim(visitor: { appId: string; userId: string }): () => void {
		const key = `app:${visitor.appId}:user:${visitor.userId}`;
		const now = Date.now();
		this.sweep(now);

		const maxTotal = this.config.agentMaxConcurrentTurns;
		if (maxTotal > 0 && this.inFlight >= maxTotal) {
			throw new AppRuntimeError(
				429,
				'too_many_requests',
				'The agent is busy. Try again in a moment.',
			);
		}

		const visitorInFlight = this.inFlightByVisitor.get(key) ?? 0;
		const maxPerVisitor = this.config.agentMaxConcurrentTurnsPerVisitor;
		if (maxPerVisitor > 0 && visitorInFlight >= maxPerVisitor) {
			throw new AppRuntimeError(
				429,
				'too_many_requests',
				'Too many agent chats are in progress. Wait for one to finish, then try again.',
			);
		}

		const maxPerHour = this.config.agentTurnsPerVisitorPerHour;
		if (maxPerHour > 0) {
			const window = this.windows.get(key);
			if (window && window.resetAt > now) {
				if (window.count >= maxPerHour) {
					throw new AppRuntimeError(
						429,
						'too_many_requests',
						'You sent too many messages to the agent. Try again later.',
					);
				}
				window.count++;
			} else {
				this.windows.set(key, { resetAt: now + HOUR_MS, count: 1 });
			}
		}

		this.inFlight++;
		this.inFlightByVisitor.set(key, visitorInFlight + 1);
		let released = false;
		return () => {
			if (released) return;
			released = true;
			this.inFlight--;
			const remaining = (this.inFlightByVisitor.get(key) ?? 1) - 1;
			if (remaining > 0) this.inFlightByVisitor.set(key, remaining);
			else this.inFlightByVisitor.delete(key);
		};
	}

	/** Drops expired windows once per hour, so visitors who do not come back do not stay in memory. */
	private sweep(now: number) {
		if (now < this.nextSweepAt) return;
		this.nextSweepAt = now + HOUR_MS;
		for (const [key, window] of this.windows) {
			if (window.resetAt <= now) this.windows.delete(key);
		}
	}
}

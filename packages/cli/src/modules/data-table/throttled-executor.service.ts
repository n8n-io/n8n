import { Service } from '@n8n/di';

@Service()
export class ThrottledExecutor {
	private lastCheck: Date | undefined;
	private pendingCheck: Promise<void> | null = null;
	private readonly cacheDurationMs: number;

	constructor(cacheDurationMs = 1000) {
		this.cacheDurationMs = cacheDurationMs;
	}

	async executeIfNeeded(checkFn: () => Promise<void>, now = new Date()): Promise<void> {
		// If there's already a pending check, wait for it
		if (this.pendingCheck) {
			await this.pendingCheck;
			return;
		}

		// Check if we need to run the check
		const shouldRun =
			!this.lastCheck || now.getTime() - this.lastCheck.getTime() >= this.cacheDurationMs;

		if (shouldRun) {
			this.pendingCheck = this.performCheck(checkFn, now);
			try {
				await this.pendingCheck;
			} finally {
				this.pendingCheck = null;
			}
		}
	}

	private async performCheck(checkFn: () => Promise<void>, checkTime: Date): Promise<void> {
		this.lastCheck = checkTime;
		await checkFn();
	}

	reset() {
		this.lastCheck = undefined;
		this.pendingCheck = null;
	}
}

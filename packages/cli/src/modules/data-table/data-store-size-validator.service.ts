import { Service } from '@n8n/di';

import { DataStoreValidationError } from './errors/data-store-validation.error';

@Service()
export class DataStoreSizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeInMb: number | undefined;
	private pendingCheck: Promise<number> | null = null;
	private readonly cacheDurationMs: number;

	constructor(cacheDurationMs = 1000) {
		this.cacheDurationMs = cacheDurationMs;
	}

	async validateSize(
		fetchSizeFn: () => Promise<number>,
		maxSize: number,
		now = new Date(),
	): Promise<void> {
		// If there's a pending check, wait for it to complete
		if (this.pendingCheck) {
			this.cachedSizeInMb = await this.pendingCheck;
		} else {
			// Check if we need to refresh the cached size
			const shouldRefresh =
				this.cachedSizeInMb === undefined ||
				!this.lastCheck ||
				now.getTime() - this.lastCheck.getTime() >= this.cacheDurationMs;

			if (shouldRefresh) {
				this.pendingCheck = this.performCheck(fetchSizeFn, now);
				try {
					this.cachedSizeInMb = await this.pendingCheck;
				} finally {
					this.pendingCheck = null;
				}
			}
		}

		// Always validate against the cached size
		if (this.cachedSizeInMb !== undefined && this.cachedSizeInMb >= maxSize) {
			throw new DataStoreValidationError(
				`Data store size limit exceeded: ${this.cachedSizeInMb}MB used, limit is ${maxSize}MB`,
			);
		}
	}

	private async performCheck(fetchSizeFn: () => Promise<number>, checkTime: Date): Promise<number> {
		const result = await fetchSizeFn();
		this.lastCheck = checkTime;
		return result;
	}

	reset() {
		this.lastCheck = undefined;
		this.cachedSizeInMb = undefined;
		this.pendingCheck = null;
	}

	getSize() {
		return this.cachedSizeInMb ?? 0;
	}
}

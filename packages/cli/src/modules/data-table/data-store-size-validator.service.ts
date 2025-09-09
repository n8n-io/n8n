import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { DataStoreValidationError } from './errors/data-store-validation.error';

@Service()
export class DataStoreSizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeInBytes: number | undefined;
	private pendingCheck: Promise<number> | null = null;

	constructor(private readonly globalConfig: GlobalConfig) {}
	async validateSize(fetchSizeFn: () => Promise<number>, now = new Date()): Promise<void> {
		// If there's a pending check, wait for it to complete

		if (this.pendingCheck) {
			this.cachedSizeInBytes = await this.pendingCheck;
		} else {
			// Check if we need to refresh the db size
			const shouldRefresh =
				this.cachedSizeInBytes === undefined ||
				!this.lastCheck ||
				now.getTime() - this.lastCheck.getTime() >=
					this.globalConfig.datatable.sizeCheckCacheDuration;

			if (shouldRefresh) {
				this.pendingCheck = fetchSizeFn();
				try {
					this.cachedSizeInBytes = await this.pendingCheck;
					this.lastCheck = now;
				} finally {
					this.pendingCheck = null;
				}
			}
		}

		// Always validate against the cache size
		if (
			this.cachedSizeInBytes !== undefined &&
			this.cachedSizeInBytes >= this.globalConfig.datatable.maxSize
		) {
			throw new DataStoreValidationError(
				`Data store size limit exceeded: ${this.toMb(this.cachedSizeInBytes)}MB used, limit is ${this.toMb(this.globalConfig.datatable.maxSize)}MB`,
			);
		}
	}

	private toMb(sizeInBytes: number): number {
		return Math.round(sizeInBytes / (1024 * 1024));
	}

	reset() {
		this.lastCheck = undefined;
		this.cachedSizeInBytes = undefined;
		this.pendingCheck = null;
	}

	getCachedSize() {
		return this.toMb(this.cachedSizeInBytes ?? 0);
	}
}

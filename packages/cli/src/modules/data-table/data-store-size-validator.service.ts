import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { DataStoreValidationError } from './errors/data-store-validation.error';
import { DataTableSizeStatus } from 'n8n-workflow';

@Service()
export class DataStoreSizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeInBytes: number | undefined;
	private pendingCheck: Promise<number> | null = null;

	constructor(private readonly globalConfig: GlobalConfig) {}

	private shouldRefresh(sizeInBytes: number | undefined, now: Date): sizeInBytes is undefined {
		if (
			!this.lastCheck ||
			now.getTime() - this.lastCheck.getTime() >= this.globalConfig.dataTable.sizeCheckCacheDuration
		) {
			sizeInBytes = undefined;
		}

		return sizeInBytes === undefined;
	}

	async getCachedSize(fetchSizeFn: () => Promise<number>, now = new Date()): Promise<number> {
		// If there's a pending check, wait for it to complete

		if (this.pendingCheck) {
			this.cachedSizeInBytes = await this.pendingCheck;
		} else {
			// Check if we need to refresh the db size

			if (this.shouldRefresh(this.cachedSizeInBytes, now)) {
				this.pendingCheck = fetchSizeFn();
				try {
					this.cachedSizeInBytes = await this.pendingCheck;
					this.lastCheck = now;
				} finally {
					this.pendingCheck = null;
				}
			}
		}

		return this.cachedSizeInBytes;
	}

	async validateSize(fetchSizeFn: () => Promise<number>, now = new Date()): Promise<void> {
		const size = await this.getCachedSize(fetchSizeFn, now);
		if (size >= this.globalConfig.dataTable.maxSize) {
			throw new DataStoreValidationError(
				`Data store size limit exceeded: ${this.toMb(size)}MB used, limit is ${this.toMb(this.globalConfig.dataTable.maxSize)}MB`,
			);
		}
	}

	sizeToState(sizeBytes: number): DataTableSizeStatus {
		if (sizeBytes >= this.globalConfig.dataTable.maxSize) {
			return 'error';
		} else if (sizeBytes >= this.globalConfig.dataTable.warningThreshold) {
			return 'warn';
		}
		return 'ok';
	}

	async getSizeStatus(fetchSizeFn: () => Promise<number>, now = new Date()) {
		const size = await this.getCachedSize(fetchSizeFn, now);
		return this.sizeToState(size);
	}

	private toMb(sizeInBytes: number): number {
		return Math.round(sizeInBytes / (1024 * 1024));
	}

	reset() {
		this.lastCheck = undefined;
		this.cachedSizeInBytes = undefined;
		this.pendingCheck = null;
	}
}

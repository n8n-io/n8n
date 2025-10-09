import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataTableSizeStatus, DataTablesSizeData } from 'n8n-workflow';

import { DataStoreValidationError } from './errors/data-store-validation.error';

@Service()
export class DataStoreSizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeData: DataTablesSizeData | undefined;
	private pendingCheck: Promise<DataTablesSizeData> | null = null;

	constructor(private readonly globalConfig: GlobalConfig) {}

	private shouldRefresh(now: Date): boolean {
		if (
			!this.lastCheck ||
			!this.cachedSizeData ||
			now.getTime() - this.lastCheck.getTime() >= this.globalConfig.dataTable.sizeCheckCacheDuration
		) {
			return true;
		}

		return false;
	}

	async getCachedSizeData(
		fetchSizeDataFn: () => Promise<DataTablesSizeData>,
		now = new Date(),
	): Promise<DataTablesSizeData> {
		// If there's a pending check, wait for it to complete
		if (this.pendingCheck) {
			this.cachedSizeData = await this.pendingCheck;
		} else {
			// Check if we need to refresh the size data
			if (this.shouldRefresh(now)) {
				this.pendingCheck = fetchSizeDataFn();
				try {
					this.cachedSizeData = await this.pendingCheck;
					this.lastCheck = now;
				} finally {
					this.pendingCheck = null;
				}
			}
		}

		return this.cachedSizeData!;
	}

	async validateSize(
		fetchSizeFn: () => Promise<DataTablesSizeData>,
		now = new Date(),
	): Promise<void> {
		const size = await this.getCachedSizeData(fetchSizeFn, now);
		if (size.totalBytes >= this.globalConfig.dataTable.maxSize) {
			throw new DataStoreValidationError(
				`Data store size limit exceeded: ${this.toMb(size.totalBytes)}MB used, limit is ${this.toMb(this.globalConfig.dataTable.maxSize)}MB`,
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

	async getSizeStatus(fetchSizeFn: () => Promise<DataTablesSizeData>, now = new Date()) {
		const size = await this.getCachedSizeData(fetchSizeFn, now);
		return this.sizeToState(size.totalBytes);
	}

	private toMb(sizeInBytes: number): number {
		return Math.round(sizeInBytes / (1024 * 1024));
	}

	reset() {
		this.lastCheck = undefined;
		this.cachedSizeData = undefined;
		this.pendingCheck = null;
	}
}

import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataTableSizeStatus } from 'n8n-workflow';

import { DataTablesSizeData } from './data-store.types';
import { DataStoreValidationError } from './errors/data-store-validation.error';

interface CacheEntry {
	lastCheck: Date;
	data: DataTablesSizeData;
	pendingCheck?: Promise<DataTablesSizeData>;
}

@Service()
export class DataStoreSizeValidator {
	private cache: Map<string, CacheEntry> = new Map();

	constructor(private readonly globalConfig: GlobalConfig) {}

	private shouldRefresh(cacheKey: string, now: Date): boolean {
		const entry = this.cache.get(cacheKey);
		if (
			!entry ||
			now.getTime() - entry.lastCheck.getTime() >=
				this.globalConfig.dataTable.sizeCheckCacheDuration
		) {
			return true;
		}

		return false;
	}

	async getCachedSizeData(
		cacheKey: string,
		fetchSizeDataFn: () => Promise<DataTablesSizeData>,
		now = new Date(),
	): Promise<DataTablesSizeData> {
		const entry = this.cache.get(cacheKey);

		// If there's a pending check for this key, wait for it to complete
		if (entry?.pendingCheck) {
			const result = await entry.pendingCheck;
			entry.data = result;
			entry.lastCheck = now;
			delete entry.pendingCheck;
			return result;
		}

		// Check if we need to refresh the size data
		if (this.shouldRefresh(cacheKey, now)) {
			const pendingCheck = fetchSizeDataFn();

			if (entry) {
				entry.pendingCheck = pendingCheck;
			} else {
				// Create new entry with pending check
				this.cache.set(cacheKey, {
					lastCheck: now,
					data: { totalBytes: 0, dataTables: {} }, // Temporary data
					pendingCheck,
				});
			}

			try {
				const result = await pendingCheck;
				const cacheEntry = this.cache.get(cacheKey)!;
				cacheEntry.data = result;
				cacheEntry.lastCheck = now;
				delete cacheEntry.pendingCheck;
				return result;
			} catch (error) {
				// Clean up pending check on error
				const cacheEntry = this.cache.get(cacheKey);
				if (cacheEntry) {
					delete cacheEntry.pendingCheck;
				}
				throw error;
			}
		}

		return entry!.data;
	}

	async validateSize(
		cacheKey: string,
		fetchSizeFn: () => Promise<DataTablesSizeData>,
		now = new Date(),
	): Promise<void> {
		const size = await this.getCachedSizeData(cacheKey, fetchSizeFn, now);
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

	async getSizeStatus(
		cacheKey: string,
		fetchSizeFn: () => Promise<DataTablesSizeData>,
		now = new Date(),
	) {
		const size = await this.getCachedSizeData(cacheKey, fetchSizeFn, now);
		return this.sizeToState(size.totalBytes);
	}

	private toMb(sizeInBytes: number): number {
		return Math.round(sizeInBytes / (1024 * 1024));
	}

	reset() {
		this.cache.clear();
	}
}

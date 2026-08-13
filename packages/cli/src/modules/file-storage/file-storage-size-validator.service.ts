import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { Telemetry } from '@/telemetry';

import { FileStorageValidationError } from './errors/file-storage-validation.error';
import type { FileStorageSizeData, FileStorageSizeStatus } from './types';
import { toMb } from './utils/size-utils';

@Service()
export class FileStorageSizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeData: FileStorageSizeData | undefined;
	private pendingCheck: Promise<FileStorageSizeData> | null = null;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
	) {}

	private shouldRefresh(now: Date): boolean {
		return (
			!this.lastCheck ||
			!this.cachedSizeData ||
			now.getTime() - this.lastCheck.getTime() >=
				this.globalConfig.fileStorage.sizeCheckCacheDuration
		);
	}

	async getCachedSizeData(
		fetchSizeDataFn: () => Promise<FileStorageSizeData>,
		now = new Date(),
	): Promise<FileStorageSizeData> {
		// If there's a pending check, wait for it to complete
		if (this.pendingCheck) {
			this.cachedSizeData = await this.pendingCheck;
		} else if (this.shouldRefresh(now)) {
			this.pendingCheck = fetchSizeDataFn();
			try {
				this.cachedSizeData = await this.pendingCheck;
				this.lastCheck = now;
			} finally {
				this.pendingCheck = null;
			}
		}

		return this.cachedSizeData!;
	}

	async validateSize(
		fetchSizeFn: () => Promise<FileStorageSizeData>,
		surface: 'ui-upload' | 'node-write',
		now = new Date(),
	): Promise<void> {
		const size = await this.getCachedSizeData(fetchSizeFn, now);
		if (size.totalBytes >= this.globalConfig.fileStorage.maxSize) {
			this.telemetry.track(TELEMETRY_EVENT.FILES.USER_HIT_FILE_STORAGE_LIMIT, {
				total_bytes: size.totalBytes,
				max_bytes: this.globalConfig.fileStorage.maxSize,
				surface,
			});

			throw new FileStorageValidationError(
				`File storage limit exceeded: ${toMb(size.totalBytes)}MB used, limit is ${toMb(this.globalConfig.fileStorage.maxSize)}MB`,
			);
		}
	}

	sizeToState(sizeBytes: number): FileStorageSizeStatus {
		const warningThreshold =
			this.globalConfig.fileStorage.warningThreshold ??
			Math.floor(0.8 * this.globalConfig.fileStorage.maxSize);

		if (sizeBytes >= this.globalConfig.fileStorage.maxSize) {
			return 'error';
		} else if (sizeBytes >= warningThreshold) {
			return 'warn';
		}
		return 'ok';
	}

	reset() {
		this.lastCheck = undefined;
		this.cachedSizeData = undefined;
		this.pendingCheck = null;
	}
}

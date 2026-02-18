import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { ChatMemoryStorageLimitError } from './errors/chat-memory-storage-limit.error';

interface ChatMemorySizeData {
	totalBytes: number;
}

function toMb(sizeInBytes: number): number {
	return Math.round(sizeInBytes / (1024 * 1024));
}

export type ChatMemorySizeStatus = 'ok' | 'warn' | 'error';

@Service()
export class ChatMemorySizeValidator {
	private lastCheck: Date | undefined;
	private cachedSizeData: ChatMemorySizeData | undefined;
	private pendingCheck: Promise<ChatMemorySizeData> | null = null;

	constructor(private readonly globalConfig: GlobalConfig) {}

	private shouldRefresh(): boolean {
		if (
			!this.lastCheck ||
			!this.cachedSizeData ||
			Date.now() - this.lastCheck.getTime() >=
				this.globalConfig.chatHub.chatMemorySizeCheckCacheDuration
		) {
			return true;
		}

		return false;
	}

	async getCachedSizeData(
		fetchSizeDataFn: () => Promise<ChatMemorySizeData>,
	): Promise<ChatMemorySizeData> {
		if (this.pendingCheck) {
			this.cachedSizeData = await this.pendingCheck;
		} else {
			if (this.shouldRefresh()) {
				this.pendingCheck = fetchSizeDataFn();
				try {
					this.cachedSizeData = await this.pendingCheck;
					this.lastCheck = new Date();
				} finally {
					this.pendingCheck = null;
				}
			}
		}

		return this.cachedSizeData!;
	}

	async validateSize(fetchSizeFn: () => Promise<ChatMemorySizeData>): Promise<void> {
		const size = await this.getCachedSizeData(fetchSizeFn);
		if (size.totalBytes >= this.globalConfig.chatHub.chatMemoryMaxSize) {
			throw new ChatMemoryStorageLimitError(
				`Chat memory size limit exceeded: ${toMb(size.totalBytes)}MB used, limit is ${toMb(this.globalConfig.chatHub.chatMemoryMaxSize)}MB`,
			);
		}
	}

	sizeToState(sizeBytes: number): ChatMemorySizeStatus {
		const warningThreshold =
			this.globalConfig.chatHub.chatMemoryWarningThreshold ??
			Math.floor(0.8 * this.globalConfig.chatHub.chatMemoryMaxSize);

		if (sizeBytes >= this.globalConfig.chatHub.chatMemoryMaxSize) {
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

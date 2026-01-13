import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from 'n8n-workflow';

import { ChatMemorySessionRepository } from './chat-memory-session.repository';
import { ChatMemoryRepository } from './chat-memory.repository';

const CLEANUP_INTERVAL_MS = 15 * Time.minutes.toMilliseconds;

/**
 * Responsible for cleaning up expired chat memory entries and orphaned memory sessions.
 *
 * - Runs every 15 minutes on the leader instance
 * - Deletes memory entries where expiresAt < NOW
 * - Deletes memory sessions that have no memory entries
 */
@Service()
export class ChatMemoryCleanupService {
	private cleanupInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly memoryRepository: ChatMemoryRepository,
		private readonly memorySessionRepository: ChatMemorySessionRepository,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	private get isEnabled() {
		return this.instanceSettings.instanceType === 'main' && this.instanceSettings.isLeader;
	}

	@OnLeaderTakeover()
	startCleanup() {
		if (!this.isEnabled || this.isShuttingDown) return;

		this.scheduleCleanup();

		this.logger.debug('Started chat memory cleanup timer');
	}

	@OnLeaderStepdown()
	stopCleanup() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
			this.logger.debug('Stopped chat memory cleanup timer');
		}
	}

	private scheduleCleanup() {
		this.cleanupInterval = setInterval(async () => {
			await this.runCleanup();
		}, CLEANUP_INTERVAL_MS);

		this.logger.debug(
			`Chat memory cleanup every ${CLEANUP_INTERVAL_MS * Time.milliseconds.toMinutes} minutes`,
		);
	}

	async runCleanup(): Promise<void> {
		try {
			this.logger.debug('Running chat memory cleanup');

			// Delete expired memory entries
			const deletedMemoryCount = await this.memoryRepository.deleteExpiredEntries();
			if (deletedMemoryCount > 0) {
				this.logger.debug('Deleted expired memory entries', { count: deletedMemoryCount });
			}

			// Delete orphaned memory sessions (sessions with no memory entries)
			const deletedMemorySessionCount = await this.memorySessionRepository.deleteOrphanedSessions();
			if (deletedMemorySessionCount > 0) {
				this.logger.debug('Deleted orphaned memory sessions', { count: deletedMemorySessionCount });
			}
		} catch (error) {
			this.logger.error('Failed to run chat memory cleanup', { error: ensureError(error) });
		} finally {
			this.logger.debug('Chat memory cleanup completed');
		}
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopCleanup();
	}
}

import { instanceAiThreadTabsStateSchema, type InstanceAiThreadTabsState } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { InstanceAiThreadTabsRepository } from './repositories/instance-ai-thread-tabs.repository';

/** Saves and loads the tabs that each user has open in a thread. */
@Service()
export class InstanceAiThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly threadTabsRepository: InstanceAiThreadTabsRepository,
	) {}

	async getState(threadId: string, userId: string): Promise<InstanceAiThreadTabsState | null> {
		const stored = await this.threadTabsRepository.findState(threadId, userId);
		if (stored === null) return null;

		// A state saved by an older schema must not break the tab bar. The client
		// falls back to the default tabs and saves a valid state on the next change.
		const parsed = instanceAiThreadTabsStateSchema.safeParse(stored);
		if (!parsed.success) {
			this.logger.warn('Ignoring invalid stored Instance AI thread tabs', { threadId });
			return null;
		}
		return parsed.data;
	}

	async saveState(
		threadId: string,
		userId: string,
		state: InstanceAiThreadTabsState,
	): Promise<void> {
		await this.threadTabsRepository.saveState(threadId, userId, state);
	}
}

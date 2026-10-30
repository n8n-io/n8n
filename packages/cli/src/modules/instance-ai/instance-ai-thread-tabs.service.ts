import { assistantThreadTabsStateSchema, type AssistantThreadTabsState } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { InstanceAiChangedArtifact } from '@n8n/instance-ai';

import { AssistantArtifactNamesService } from './assistant-agent/assistant-artifact-names.service';
import { withShownTab } from './assistant-agent/assistant-thread-tabs';
import { InstanceAiThreadTabsRepository } from './repositories/instance-ai-thread-tabs.repository';

/** Saves and loads the tabs that each user has open in a thread. */
@Service()
export class InstanceAiThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly threadTabsRepository: InstanceAiThreadTabsRepository,
		private readonly artifactNames: AssistantArtifactNamesService,
	) {}

	async getState(threadId: string, userId: string): Promise<AssistantThreadTabsState | null> {
		const stored = await this.threadTabsRepository.findState(threadId, userId);
		return this.parseStored(threadId, stored);
	}

	async saveState(
		threadId: string,
		userId: string,
		state: AssistantThreadTabsState,
	): Promise<void> {
		await this.threadTabsRepository.saveState(threadId, userId, state);
	}

	/**
	 * Show the tab of an artifact the agent created or changed, as the frontend
	 * does during a live run. A tab the user closed opens again. The first
	 * artifact of a thread creates its stored tabs.
	 */
	async showArtifactTab(
		threadId: string,
		userId: string,
		artifact: InstanceAiChangedArtifact,
	): Promise<void> {
		const tab = await this.artifactNames.withCurrentName(artifact);
		await this.threadTabsRepository.updateState(threadId, userId, (stored) =>
			withShownTab(this.parseStored(threadId, stored), tab),
		);
	}

	private parseStored(threadId: string, stored: unknown): AssistantThreadTabsState | null {
		if (stored === null) return null;

		// A state saved by an older schema must not break the tab bar. The client
		// falls back to the default tabs and saves a valid state on the next change.
		const parsed = assistantThreadTabsStateSchema.safeParse(stored);
		if (!parsed.success) {
			this.logger.warn('Ignoring invalid stored Instance AI thread tabs', { threadId });
			return null;
		}
		return parsed.data;
	}
}

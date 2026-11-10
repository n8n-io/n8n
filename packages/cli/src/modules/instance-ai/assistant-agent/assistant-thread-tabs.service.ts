import { assistantThreadTabsStateSchema, type AssistantThreadTabsState } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { patchThread, type InstanceAiChangedArtifact } from '@n8n/instance-ai';

import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';
import { AssistantArtifactNamesService } from './assistant-artifact-names.service';
import { ASSISTANT_TABS_METADATA_KEY, withShownTab } from './assistant-thread-tabs';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/**
 * Saves and loads the tabs of Assistant agent threads, in the thread metadata
 * of the Agents memory. A thread has one owner, so it stores one state.
 */
@Service()
export class AssistantThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly threadMetadata: SystemAgentThreadMetadataService,
		private readonly artifactNames: AssistantArtifactNamesService,
	) {}

	/** The stored tabs of a thread that the user can use. */
	async getState(user: User, threadId: string): Promise<AssistantThreadTabsState | null> {
		const stored = await this.threadMetadata.read(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			ASSISTANT_TABS_METADATA_KEY,
		);
		return this.parseStored(threadId, stored);
	}

	/**
	 * Store the tabs of a thread that the user can use. A thread gets its memory
	 * row with its first turn, so a save before then does nothing.
	 */
	async saveState(user: User, threadId: string, state: AssistantThreadTabsState): Promise<void> {
		await this.threadMetadata.update(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			ASSISTANT_TABS_METADATA_KEY,
			() => state,
		);
	}

	/**
	 * Show the tab of an artifact that a turn created or changed, as the frontend
	 * does during a live run. A tab the user closed opens again. The first
	 * artifact of a thread creates its stored tabs. The turn has access to its
	 * thread, so this uses the memory of the turn.
	 */
	async showArtifactTab(
		memory: AssistantTurnMemory,
		threadId: string,
		artifact: InstanceAiChangedArtifact,
	): Promise<void> {
		const tab = await this.artifactNames.withCurrentName(artifact);
		// `patchThread` replaces the whole metadata, so keep the other keys.
		await patchThread(memory, {
			threadId,
			update: ({ metadata }) => {
				const stored = this.parseStored(threadId, metadata?.[ASSISTANT_TABS_METADATA_KEY]);
				const next = withShownTab(stored, tab);
				if (next === null) return null;
				return { metadata: { ...metadata, [ASSISTANT_TABS_METADATA_KEY]: next } };
			},
		});
	}

	private parseStored(threadId: string, stored: unknown): AssistantThreadTabsState | null {
		if (stored === undefined || stored === null) return null;

		// A state saved by an older schema must not break the tab bar. The client
		// falls back to the default tabs and saves a valid state on the next change.
		const parsed = assistantThreadTabsStateSchema.safeParse(stored);
		if (!parsed.success) {
			this.logger.warn('Ignoring invalid stored Assistant thread tabs', { threadId });
			return null;
		}
		return parsed.data;
	}
}

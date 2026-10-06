import { instanceAiThreadTabsStateSchema, type InstanceAiThreadTabsState } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { N8nMemory } from '../agents/integrations/n8n-memory';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/** Thread metadata key for the open artifact tabs. A thread has one owner, so no user key. */
const TABS_METADATA_KEY = 'instanceAiTabs';

@Service()
export class InstanceAiThreadTabsService {
	constructor(
		private readonly logger: Logger,
		private readonly memory: N8nMemory,
	) {}

	async getState(threadId: string, _userId: string): Promise<InstanceAiThreadTabsState | null> {
		const thread = await this.threads().getThread(threadId);
		const stored = thread?.metadata?.[TABS_METADATA_KEY];
		if (stored === undefined || stored === null) return null;

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
		_userId: string,
		state: InstanceAiThreadTabsState,
	): Promise<void> {
		await this.threads().patchThread({
			threadId,
			update: ({ metadata }) => ({ metadata: { ...metadata, [TABS_METADATA_KEY]: state } }),
		});
	}

	private threads() {
		return this.memory.getImplementation(ASSISTANT_AGENT_ID);
	}
}

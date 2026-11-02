import { OwnershipTransferHandlerRegistry } from '@n8n/backend-services';
import { Container } from '@n8n/di';

import { AgentMemoryEntryRepository } from './repositories/agent-memory-entry.repository';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
} from './utils/agent-memory-scope';

/** Stop recall of a deleted user's private memories. Keep sessions and trace evidence. */
export function registerUserDeletionHandler() {
	Container.get(OwnershipTransferHandlerRegistry).register({
		resource: 'agent-user-memory',
		transferAll: async () => {},
		deleteAll: async () => {},
		deleteAllForUser: async (userId) => {
			await Container.get(AgentMemoryEntryRepository).retireUserScopes(
				[
					draftChatMemoryResourceId(userId),
					productionChatMemoryResourceId(userId),
					systemChatMemoryResourceId(userId),
				],
				{},
			);
		},
	});
}

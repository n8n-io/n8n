import { OwnershipTransferHandlerRegistry } from '@n8n/backend-services';
import { Container } from '@n8n/di';

import { SystemAgentExecutionService } from './system-agents/system-agent-execution.service';

/**
 * Delete the private system agent sessions of a user before the user is
 * deleted, with or without a transferee. It does not check the Agents feature
 * toggle: sessions created while it was on must go too.
 *
 * Agents and their shared sessions are not transferred or deleted here (see
 * `ownership-transfer.manifest.json`), so the project-keyed methods do nothing.
 */
export function registerUserDeletionHandler() {
	Container.get(OwnershipTransferHandlerRegistry).register({
		resource: 'agent-system-sessions',
		transferAll: async () => {},
		deleteAll: async () => {},
		deleteAllForUser: async (userId) => {
			await Container.get(SystemAgentExecutionService).deleteThreadsOfUser(userId);
		},
	});
}

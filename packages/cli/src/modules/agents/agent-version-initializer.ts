import { Logger } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentDefinitionService } from './agent-definition.service';
import { AgentRepository } from './repositories/agent.repository';

const BACKFILL_BATCH_SIZE = 100;

/** Backfill missing history snapshots for existing Agent drafts at startup. */
@Service()
export class AgentVersionInitializer {
	constructor(
		private readonly agents: AgentRepository,
		private readonly definitions: AgentDefinitionService,
		private readonly transactionRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	async run(): Promise<void> {
		let afterId: string | undefined;
		let ids: string[];
		while (
			(ids = await this.agents.findMissingVersionIds(BACKFILL_BATCH_SIZE, afterId)).length > 0
		) {
			for (const id of ids) {
				try {
					await this.transactionRunner.run({}, async (ctx) => {
						const agent = await this.agents.lockForVersionCapture(id, ctx);
						if (agent) await this.definitions.captureVersion(agent, 'Unknown', ctx);
					});
				} catch (error) {
					// The transaction rolls back. The next startup can try this draft again.
					this.logger.error('Failed to capture the initial Agent version', { agentId: id, error });
				}
			}
			afterId = ids[ids.length - 1];
		}
	}
}

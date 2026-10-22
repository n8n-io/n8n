import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentDefinitionService } from './agent-definition.service';
import { AgentRepository } from './repositories/agent.repository';

/** Capture pre-upgrade drafts before the module serves saved-version requests. */
@Service()
export class AgentVersionInitializer {
	constructor(
		private readonly agents: AgentRepository,
		private readonly definitions: AgentDefinitionService,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async run(): Promise<void> {
		let ids: string[];
		while ((ids = await this.agents.findMissingVersionIds(100)).length > 0) {
			for (const id of ids) {
				await this.transactionRunner.run({}, async (ctx) => {
					const agent = await this.agents.lockForVersionCapture(id, ctx);
					if (agent) await this.definitions.captureVersion(agent, 'Unknown', ctx);
				});
			}
		}
	}
}

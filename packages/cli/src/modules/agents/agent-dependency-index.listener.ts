import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

import { AgentDependencyIndexService } from './agent-dependency-index.service';

@Service()
export class AgentDependencyIndexListener {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly indexService: AgentDependencyIndexService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	init(): void {
		this.eventService.on('server-started', async () => {
			await this.run('build dependency index', async () => {
				await this.indexService.buildIndex();
			});
		});
		this.eventService.on('agent-saved', async ({ agentId }) => {
			await this.run('refresh dependency index', async () => {
				await this.indexService.refresh(agentId);
			});
		});
		this.eventService.on('agent-deleted', async ({ agentId }) => {
			await this.run('remove dependency index entries', async () => {
				await this.indexService.remove(agentId);
			});
		});
	}

	private async run(action: string, operation: () => Promise<void>): Promise<void> {
		try {
			await operation();
		} catch (error) {
			this.logger.error(`Failed to ${action}`, { error });
		}
	}
}

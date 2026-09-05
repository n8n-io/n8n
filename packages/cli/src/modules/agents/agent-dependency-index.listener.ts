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

		// `workflow-deleted` is not subscribed: the FK cascade removes the index rows
		// before the event fires. Deleting requires archiving first, which is covered.
		const invalidate = async ({ workflowId }: { workflowId: string }) => {
			await this.run('invalidate dependent agent runtimes', async () => {
				await this.indexService.invalidateRuntimesForWorkflow(workflowId);
			});
		};
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await invalidate({ workflowId: workflow.id });
		});
		this.eventService.on('workflow-activated', invalidate);
		this.eventService.on('workflow-deactivated', invalidate);
		this.eventService.on('workflow-archived', invalidate);
		this.eventService.on('workflow-unarchived', invalidate);
		this.eventService.on('workflow-published-version-changed', invalidate);
	}

	private async run(action: string, operation: () => Promise<void>): Promise<void> {
		try {
			await operation();
		} catch (error) {
			this.logger.error(`Failed to ${action}`, { error });
		}
	}
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { formatResult, type WorkflowToolWaitRegistration } from './workflow-tool-factory';

/**
 * Process-local registry: when a workflow tool's child parks in `waiting`,
 * the tool handler registers here and suspends the parent agent. On the
 * child's `workflow-post-execute` we resume the agent with the real output.
 *
 * Does not survive multi-main/queue hops — the instance that parked the child
 * must be the one that sees it finish.
 */
@Service()
export class AgentWorkflowToolWaitService {
	private readonly pending = new Map<string, WorkflowToolWaitRegistration>();

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
	) {
		this.logger = this.logger.scoped('agents');
		this.eventService.on('workflow-post-execute', (event) => {
			void this.onWorkflowPostExecute(event);
		});
	}

	register(childExecutionId: string, entry: WorkflowToolWaitRegistration): void {
		this.pending.set(childExecutionId, entry);
	}

	get(childExecutionId: string): WorkflowToolWaitRegistration | undefined {
		return this.pending.get(childExecutionId);
	}

	delete(childExecutionId: string): boolean {
		return this.pending.delete(childExecutionId);
	}

	private async onWorkflowPostExecute(
		event: RelayEventMap['workflow-post-execute'],
	): Promise<void> {
		const entry = this.pending.get(event.executionId);
		if (!entry) return;

		this.delete(event.executionId);

		const resumeData = formatResult(
			event.executionId,
			event.runData?.status,
			event.runData?.data,
			entry.allOutputs,
		);

		try {
			const stream = this.agentExecutionOrchestratorService.resumeForChat({
				agentId: entry.agentId,
				projectId: entry.projectId,
				runId: entry.runId,
				toolCallId: entry.toolCallId,
				resumeData,
				...(entry.integrationType !== undefined ? { integrationType: entry.integrationType } : {}),
				usePublishedVersion: entry.usePublishedVersion,
				...(entry.user !== undefined ? { user: entry.user } : {}),
			});
			for await (const _chunk of stream) {
				// Drain so recorder/persistence side effects run.
			}
		} catch (error) {
			this.logger.error('Failed to resume agent after workflow tool child completed', {
				executionId: event.executionId,
				agentId: entry.agentId,
				runId: entry.runId,
				toolCallId: entry.toolCallId,
				error,
			});
		}
	}
}

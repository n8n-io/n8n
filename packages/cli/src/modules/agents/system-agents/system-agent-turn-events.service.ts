import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentExecutionService } from '../agent-execution.service';
import { SystemAgentExecutionService } from './system-agent-execution.service';

/**
 * Reads the host events that the turns of a system agent thread recorded, for
 * the module that owns the agent and its events. Each call runs the access
 * checks of the thread routes: thread ownership, `project:read` on the working
 * project, and the checks of the provider.
 */
@Service()
export class SystemAgentTurnEventsService {
	constructor(
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly agentExecutions: AgentExecutionService,
	) {}

	/**
	 * The payload of the host event `name` that the turn of `executionId`
	 * recorded. With `key`, only the event with this key. Returns `undefined`
	 * when the thread has no such turn, or the turn has no such event.
	 */
	async readHostEvent(
		agentId: string,
		user: User,
		threadId: string,
		executionId: string,
		name: string,
		key?: string,
	): Promise<unknown> {
		await this.systemAgents.getUsableThread(agentId, user, threadId);
		const timeline = await this.agentExecutions.findExecutionTimeline(
			agentId,
			threadId,
			executionId,
		);
		const event = timeline?.find(
			(item) =>
				item.type === 'host-event' && item.name === name && (key === undefined || item.key === key),
		);
		return event?.type === 'host-event' ? event.payload : undefined;
	}

	/** The payloads of the host events `name` that the newest `limit` turns recorded, oldest first. */
	async readRecentHostEvents(
		agentId: string,
		user: User,
		threadId: string,
		name: string,
		limit: number,
	): Promise<unknown[]> {
		const { projectId } = await this.systemAgents.getUsableThread(agentId, user, threadId);
		const page = await this.agentExecutions.getThreadDetailPage(
			threadId,
			projectId,
			agentId,
			user.id,
			{ limit },
		);
		return (page?.executions ?? []).flatMap(({ timeline }) =>
			(timeline ?? []).flatMap((item) =>
				item.type === 'host-event' && item.name === name ? [item.payload] : [],
			),
		);
	}
}

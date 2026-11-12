import type { ObservationLogEntry } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { N8nMemory } from '../integrations/n8n-memory';
import { SystemAgentExecutionService } from './system-agent-execution.service';

/** A system agent thread, as the eval mode sees it. */
export interface SystemAgentEvalThread {
	id: string;
	projectId: string;
}

/** The observational memory of a system agent thread. */
export interface SystemAgentEvalThreadMemory {
	/** The active observations, oldest first. */
	observations: Array<Pick<ObservationLogEntry, 'marker' | 'text' | 'tokenCount'>>;
	/** `null` until the observer runs. */
	cursor: { lastObservedMessageId: string; lastObservedAt: Date } | null;
}

/**
 * The Agents operations that the Assistant agent eval mode uses on system
 * agent threads. Only the lazily loaded eval code of a system agent may use
 * this service. Product code must use the system agent routes and services.
 *
 * The thread operations run the access checks of the thread routes: thread
 * ownership, the access floor and the checks of the provider.
 */
@Service()
export class SystemAgentEvalService {
	constructor(
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly n8nMemory: N8nMemory,
	) {}

	/** Create a thread in the project, with an optional client-chosen id. */
	async createThread(params: {
		agentId: string;
		user: User;
		projectId: string;
		threadId?: string;
	}): Promise<SystemAgentEvalThread> {
		const thread = await this.systemAgents.createThread(params);
		return { id: thread.id, projectId: thread.projectId };
	}

	/** Delete a thread that the user owns, with its executions, memory and files. */
	async deleteThread(agentId: string, user: User, threadId: string): Promise<void> {
		await this.systemAgents.deleteThread(agentId, user, threadId);
	}

	/** The thread, when the user owns it and can use it. Otherwise it throws `NotFoundError`. */
	async getUsableThread(
		agentId: string,
		user: User,
		threadId: string,
	): Promise<SystemAgentEvalThread> {
		const thread = await this.systemAgents.getUsableThread(agentId, user, threadId);
		return { id: thread.id, projectId: thread.projectId };
	}

	/**
	 * The active observations and the observer cursor of the thread. The
	 * caller checks thread access first.
	 */
	async getThreadMemory(agentId: string, threadId: string): Promise<SystemAgentEvalThreadMemory> {
		const memory = this.n8nMemory.getImplementation(agentId);
		// The observer uses the thread id as the observation scope id.
		const [observations, cursor] = await Promise.all([
			memory.getActiveObservationLog({ observationScopeId: threadId, order: 'asc' }),
			memory.getCursor(threadId),
		]);
		return {
			observations: observations.map(({ marker, text, tokenCount }) => ({
				marker,
				text,
				tokenCount,
			})),
			cursor: cursor && {
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt,
			},
		};
	}
}

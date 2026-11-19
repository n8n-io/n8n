import type { AgentDbMessage } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { N8nMemory } from '../integrations/n8n-memory';
import { SystemAgentExecutionService } from './system-agent-execution.service';

/** A system agent thread, as the eval mode sees it. */
export interface SystemAgentEvalThread {
	id: string;
	projectId: string;
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
	 * Create the memory row of the thread in the system chat resource of the
	 * user, as the first turn does. An existing row stays as it is. The caller
	 * checks thread access first.
	 */
	async ensureMemoryThread(agentId: string, user: User, threadId: string): Promise<void> {
		await this.n8nMemory.getImplementation(agentId).saveThread({
			id: threadId,
			resourceId: this.systemAgents.resourceIdFor(user),
		});
	}

	/**
	 * Write messages into the memory of the thread, so the next turn loads them
	 * as history. The caller checks thread access first.
	 */
	async saveMessages(
		agentId: string,
		user: User,
		threadId: string,
		messages: AgentDbMessage[],
	): Promise<void> {
		// The turns of the user use this resource, and the history load filters by it.
		await this.n8nMemory.getImplementation(agentId).saveMessages({
			threadId,
			resourceId: this.systemAgents.resourceIdFor(user),
			messages,
		});
	}
}

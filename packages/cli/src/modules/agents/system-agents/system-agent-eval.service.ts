import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

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
	constructor(private readonly systemAgents: SystemAgentExecutionService) {}

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
}

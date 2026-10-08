import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { SystemAgentProvider } from './system-agent.types';

/** Holds the code-defined instance agents. Modules register their provider at init. */
@Service()
export class SystemAgentRegistry {
	private readonly providers = new Map<string, SystemAgentProvider>();

	register(provider: SystemAgentProvider): void {
		if (this.providers.has(provider.agentId)) {
			throw new UnexpectedError(`System agent "${provider.agentId}" is already registered`);
		}
		this.providers.set(provider.agentId, provider);
	}

	get(agentId: string): SystemAgentProvider | undefined {
		return this.providers.get(agentId);
	}

	has(agentId: string): boolean {
		return this.providers.has(agentId);
	}

	/**
	 * Whether `user` can use the instance agent `agentId` in the project, also to read its
	 * threads. True for any other agent id: project agents keep only the route's own checks.
	 */
	async allows(agentId: string, user: User, projectId: string): Promise<boolean> {
		const provider = this.providers.get(agentId);
		return !provider || (await provider.authorize(user, projectId));
	}

	/**
	 * Whether `user` can read the threads of the agent that other users own in the project.
	 * An instance agent decides with its sharing rules, and without rules only the owner
	 * reads. True for project agents, which keep only the route's own checks.
	 */
	async readsOthersThreads(agentId: string, user: User, projectId: string): Promise<boolean> {
		const provider = this.providers.get(agentId);
		if (!provider) return true;
		return (await provider.sharing?.canReadSharedIn(user, projectId)) === true;
	}

	/**
	 * Whether `user` can read `thread` in addition to the route's own checks. The owner reads
	 * the thread. Another user reads a thread of an instance agent only as its sharing rules
	 * allow, so that every route of the agent applies the same reader rule.
	 */
	async canReadThread(user: User, thread: AgentExecutionThread): Promise<boolean> {
		const provider = this.providers.get(thread.agentId);
		if (!provider || thread.ownerId === user.id) return true;
		return (await provider.sharing?.canRead(user, thread)) === true;
	}
}

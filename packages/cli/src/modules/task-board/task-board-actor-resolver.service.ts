import type { TaskBoardActorType } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { isPerson, UserRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';

export type ActorKey = { type: TaskBoardActorType; id: string };

export const actorKey = ({ type, id }: ActorKey) => `${type}:${id}`;

const UNKNOWN_NAMES: Record<TaskBoardActorType, string> = {
	user: 'Unknown user',
	agent: 'Unknown agent',
	workflow: 'Workflow',
};

type AgentSummary = { id: string; name: string; projectId: string };

/** An agent that a task of the project can have as assignee. */
export type TaskBoardProjectAgent = {
	id: string;
	name: string;
	description: string;
	/** A dispatcher workflow can run only a published agent. */
	isPublished: boolean;
};

/**
 * Resolves display names of users, agents and workflows. Agents live in the agents module,
 * which can be disabled, so agent lookups load it lazily and fall back to a generic name.
 */
@Service()
export class TaskBoardActorResolver {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('task-board');
	}

	/** A map from `actorKey(...)` to the display name of each actor. */
	async resolveNames(actors: ActorKey[]): Promise<Map<string, string>> {
		const idsByType: Record<TaskBoardActorType, Set<string>> = {
			user: new Set(),
			agent: new Set(),
			workflow: new Set(),
		};
		for (const actor of actors) idsByType[actor.type].add(actor.id);

		const names = new Map<string, string>();

		const userIds = [...idsByType.user];
		if (userIds.length > 0) {
			for (const user of await this.userRepository.findManyByIds(userIds)) {
				// Only a person has name and email columns; a service account does not.
				if (!isPerson(user)) continue;
				const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
				names.set(actorKey({ type: 'user', id: user.id }), fullName || user.email);
			}
		}

		for (const agent of await this.findAgents([...idsByType.agent])) {
			names.set(actorKey({ type: 'agent', id: agent.id }), agent.name);
		}

		const workflowIds = [...idsByType.workflow];
		if (workflowIds.length > 0) {
			const workflows = await this.workflowRepository.findByIds(workflowIds, { fields: ['name'] });
			for (const workflow of workflows) {
				names.set(actorKey({ type: 'workflow', id: workflow.id }), workflow.name);
			}
		}

		for (const actor of actors) {
			const key = actorKey(actor);
			if (!names.has(key)) names.set(key, UNKNOWN_NAMES[actor.type]);
		}

		return names;
	}

	/**
	 * The project of the agent. `undefined` when the agents module is not active, so the
	 * caller cannot check it.
	 */
	async findAgentProjectId(agentId: string): Promise<string | null | undefined> {
		if (!this.moduleRegistry.isActive('agents')) return undefined;
		const [agent] = await this.findAgents([agentId]);
		return agent?.projectId ?? null;
	}

	/**
	 * The agents of the project that are not archived. Empty when the agents module is not
	 * active. The description comes from the published version, which is the version that a
	 * dispatcher workflow runs.
	 */
	async findProjectAgents(projectId: string): Promise<TaskBoardProjectAgent[]> {
		if (!this.moduleRegistry.isActive('agents')) return [];
		try {
			const { AgentRepository } = await import('../agents/repositories/agent.repository.js');
			const agents = await Container.get(AgentRepository).findByProjectId(projectId);
			return agents
				.filter((agent) => !agent.isArchived)
				.map((agent) => ({
					id: agent.id,
					name: agent.name,
					description: (agent.activeVersion?.schema ?? agent.schema)?.description?.trim() ?? '',
					isPublished: agent.activeVersionId !== null,
				}))
				.sort((a, b) => a.name.localeCompare(b.name));
		} catch (error) {
			this.logger.warn('Could not list the agents of a task board project', { error });
			return [];
		}
	}

	async userExists(userId: string) {
		const users = await this.userRepository.findManyByIds([userId]);
		return users.length > 0;
	}

	private async findAgents(agentIds: string[]): Promise<AgentSummary[]> {
		if (agentIds.length === 0 || !this.moduleRegistry.isActive('agents')) return [];
		try {
			const { AgentRepository } = await import('../agents/repositories/agent.repository.js');
			return await Container.get(AgentRepository).findSummariesByIds(agentIds);
		} catch (error) {
			this.logger.warn('Could not look up agents for a task board', { error });
			return [];
		}
	}
}

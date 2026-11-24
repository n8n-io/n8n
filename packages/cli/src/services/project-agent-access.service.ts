import type { ProjectAgentAccess } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import {
	ProjectRelationRepository,
	ProjectRepository,
	ServiceAccountRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { GLOBAL_AGENT_ROLE_SLUG, hasGlobalScope } from '@n8n/permissions';

import { ServiceAccountProjects } from './service-account-projects';

/**
 * Gives an agent access to a project that is not its own (runtime identity).
 * The agent's account gets the `project:agent` role there, so a published run
 * can use the credentials and run the workflows of that project.
 *
 * The agent keeps its role in its own project. Only the other projects can be
 * added and removed here.
 */
@Service()
export class ProjectAgentAccessService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly serviceAccountRepository: ServiceAccountRepository,
		private readonly serviceAccountProjects: ServiceAccountProjects,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/** The agents that can use this project, its own agents first. */
	async list(projectId: string): Promise<ProjectAgentAccess[]> {
		if (!this.agentsConfig.runtimeIdentityEnabled) return [];
		const ids = await this.serviceAccountRepository.findAgentAccountIdsInProject(projectId);
		const entries = await this.describe(ids);
		return entries.sort(
			(a, b) =>
				Number(b.homeProject?.id === projectId) - Number(a.homeProject?.id === projectId) ||
				a.name.localeCompare(b.name),
		);
	}

	/**
	 * The agents that the user can add to this project. A member can add only
	 * the agents of their own projects, so the agents of other projects stay
	 * private. An admin can add every agent.
	 */
	async listCandidates(user: User, projectId: string): Promise<ProjectAgentAccess[]> {
		if (!this.agentsConfig.runtimeIdentityEnabled) return [];
		const visibleProjectIds = hasGlobalScope(user, 'project:read')
			? (await this.projectRepository.findTeamProjects()).map((project) => project.id)
			: (await this.projectRelationRepository.findAllByUser(user.id)).map((r) => r.projectId);
		const visible = await this.serviceAccountProjects.findAccountIdsInProjects(visibleProjectIds);
		const current = new Set(
			await this.serviceAccountRepository.findAgentAccountIdsInProject(projectId),
		);
		return await this.describe(visible.filter((id) => !current.has(id)));
	}

	async add(user: User, projectId: string, serviceAccountId: string): Promise<void> {
		this.assertEnabled();
		const candidates = await this.listCandidates(user, projectId);
		if (!candidates.some((agent) => agent.serviceAccountId === serviceAccountId)) {
			throw new NotFoundError('Agent not found');
		}
		const account = await this.serviceAccountRepository.findActingAccount(serviceAccountId);
		if (account?.role.slug !== GLOBAL_AGENT_ROLE_SLUG) throw new NotFoundError('Agent not found');

		const joined = await this.serviceAccountRepository.joinProjectAsAgent(
			serviceAccountId,
			projectId,
		);
		if (!joined) throw new BadRequestError('Only a team project can give an agent access');
	}

	async remove(projectId: string, serviceAccountId: string): Promise<void> {
		this.assertEnabled();
		const [entry] = await this.describe([serviceAccountId]);
		if (entry?.homeProject?.id === projectId) {
			throw new ForbiddenError('An agent always has access to its own project');
		}
		await this.serviceAccountRepository.leaveProjectAsAgent(serviceAccountId, projectId);
	}

	private assertEnabled() {
		if (!this.agentsConfig.runtimeIdentityEnabled) {
			throw new BadRequestError('Agent runtime identity is not enabled on this instance');
		}
	}

	private async describe(ids: string[]): Promise<ProjectAgentAccess[]> {
		const [names, homeProjects] = await Promise.all([
			this.serviceAccountRepository.findNames(ids),
			this.serviceAccountProjects.findProjectsOfAccounts(ids),
		]);
		return ids.flatMap((id) => {
			const name = names.get(id);
			if (name === undefined) return [];
			return [{ serviceAccountId: id, name, homeProject: homeProjects.get(id) ?? null }];
		});
	}
}

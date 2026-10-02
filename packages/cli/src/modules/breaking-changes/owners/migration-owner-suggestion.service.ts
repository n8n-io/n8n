import {
	ActivityEventRepository,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import type { OwnerSuggestion } from '../database/repositories/migration-workflow-owner.repository';

/** A user and when they last acted on the workflow. */
interface Candidate {
	userId: string;
	at: Date;
}

/** Workflow history stores the author's display name, with this suffix for saves through MCP. */
const MCP_AUTHOR_SUFFIX = ' (via MCP)';

/**
 * Proposes who should fix a workflow's migration findings: the user behind the
 * most recent activity on the workflow that can be attributed to a single user,
 * else one of the owners of the workflow's project. A workflow with neither gets
 * no suggestion.
 *
 * Three records carry attributable activity, each with a gap the others cover:
 * the activity feed (user ids, but capped and recent), publish history (user
 * ids, but only for published workflows) and workflow history (every save, but
 * a display name instead of an id). A disabled, pending or deleted user is
 * never suggested.
 */
@Service()
export class MigrationOwnerSuggestionService {
	constructor(
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly userRepository: UserRepository,
	) {}

	async suggestOwners(workflowIds: string[]): Promise<OwnerSuggestion[]> {
		if (workflowIds.length === 0) return [];

		const users = await this.loadEligibleUsers();
		const latestByWorkflow = await this.findLatestAttributedActivity(workflowIds, users);

		const unresolved = workflowIds.filter((workflowId) => !latestByWorkflow.has(workflowId));
		const fallbackByWorkflow = await this.findProjectOwners(unresolved, users);

		const suggestions: OwnerSuggestion[] = [];
		for (const workflowId of workflowIds) {
			const userId = latestByWorkflow.get(workflowId)?.userId ?? fallbackByWorkflow.get(workflowId);
			if (userId) suggestions.push({ workflowId, userId });
		}
		return suggestions;
	}

	/** Every user who can be an owner, by id and by the display name workflow history records. */
	private async loadEligibleUsers(): Promise<EligibleUsers> {
		const all = await this.userRepository.findMany({ includeRole: true });
		const byId = new Map<string, User>();
		const idsByName = new Map<string, string[]>();
		for (const user of all) {
			if (user.disabled || user.isPending) continue;
			byId.set(user.id, user);
			const name = `${user.firstName} ${user.lastName}`;
			idsByName.set(name, [...(idsByName.get(name) ?? []), user.id]);
		}
		return { byId, idsByName };
	}

	/** The most recent action per workflow that one eligible user can be held to. */
	private async findLatestAttributedActivity(
		workflowIds: string[],
		users: EligibleUsers,
	): Promise<Map<string, Candidate>> {
		const [activity, publishes, versions] = await Promise.all([
			this.activityEventRepository.findLatestAttributedByResource('workflow', workflowIds),
			this.workflowPublishHistoryRepository.findLatestAttributedByWorkflowIds(workflowIds),
			this.workflowHistoryRepository.findLatestAuthorsByWorkflowIds(workflowIds),
		]);

		const latest = new Map<string, Candidate>();
		const consider = (workflowId: string, candidate: Candidate | undefined) => {
			if (!candidate || !users.byId.has(candidate.userId)) return;
			const current = latest.get(workflowId);
			if (!current || candidate.at > current.at) latest.set(workflowId, candidate);
		};

		for (const workflowId of workflowIds) {
			consider(workflowId, activity.get(workflowId));
			consider(workflowId, publishes.get(workflowId));

			// A version names its author, not a user. The name must point at exactly one
			// eligible user, else the version does not count as attributable.
			const version = versions.get(workflowId);
			if (!version) continue;
			const name = version.authors.endsWith(MCP_AUTHOR_SUFFIX)
				? version.authors.slice(0, -MCP_AUTHOR_SUFFIX.length)
				: version.authors;
			const ids = users.idsByName.get(name);
			if (ids?.length === 1) consider(workflowId, { userId: ids[0], at: version.at });
		}
		return latest;
	}

	/**
	 * One owner of each workflow's project: the owner of a personal project, or
	 * any admin of a team project. The pick among admins is stable, not meaningful.
	 */
	private async findProjectOwners(
		workflowIds: string[],
		users: EligibleUsers,
	): Promise<Map<string, string>> {
		const owners = new Map<string, string>();
		if (workflowIds.length === 0) return owners;

		const projectByWorkflow =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);
		const projectIds = [...new Set([...projectByWorkflow.values()].map((project) => project.id))];
		const [personalOwners, adminsByProject] = await Promise.all([
			this.projectRelationRepository.getPersonalProjectOwners(projectIds),
			this.projectRelationRepository.findAdminUserIdsByProjectIds(projectIds),
		]);
		const personalOwnerByProject = new Map(
			personalOwners.map((relation) => [relation.projectId, relation.userId]),
		);

		for (const [workflowId, project] of projectByWorkflow) {
			const candidates =
				project.type === 'personal'
					? [personalOwnerByProject.get(project.id)]
					: (adminsByProject.get(project.id) ?? []);
			const userId = candidates.find((id): id is string => !!id && users.byId.has(id));
			if (userId) owners.set(workflowId, userId);
		}
		return owners;
	}
}

interface EligibleUsers {
	byId: Map<string, User>;
	idsByName: Map<string, string[]>;
}

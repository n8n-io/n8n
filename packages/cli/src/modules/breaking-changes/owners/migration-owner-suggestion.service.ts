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

/** A user and when they acted on the workflow. */
interface Candidate {
	userId: string;
	at: Date;
}

/** Workflow history stores the author's display name, with this suffix for saves through MCP. */
const MCP_AUTHOR_SUFFIX = ' (via MCP)';

/**
 * How many recent actions per source and workflow are considered. The newest
 * action may belong to a user who cannot own, so a few older ones are kept to
 * fall back on before the project owner is used.
 */
const RECENT_ACTIONS_PER_WORKFLOW = 10;

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
			const userId = latestByWorkflow.get(workflowId) ?? fallbackByWorkflow.get(workflowId);
			if (userId) suggestions.push({ workflowId, userId });
		}
		return suggestions;
	}

	/** Every user who can be an owner, by id and by the display name workflow history records. */
	private async loadEligibleUsers(): Promise<EligibleUsers> {
		const all = await this.userRepository.findAllWithRoleAndAuthIdentities();
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

	/**
	 * Per workflow, the user behind the most recent action that one eligible user
	 * can be held to. An action by a user who cannot own, or a version whose author
	 * name is ambiguous, is skipped in favour of the next older one.
	 */
	private async findLatestAttributedActivity(
		workflowIds: string[],
		users: EligibleUsers,
	): Promise<Map<string, string>> {
		const limit = RECENT_ACTIONS_PER_WORKFLOW;
		const [activity, publishes, versions] = await Promise.all([
			this.activityEventRepository.findRecentAttributedByResource('workflow', workflowIds, limit),
			this.workflowPublishHistoryRepository.findRecentAttributedByWorkflowIds(workflowIds, limit),
			this.workflowHistoryRepository.findRecentAuthorsByWorkflowIds(workflowIds, limit),
		]);

		const latest = new Map<string, string>();
		for (const workflowId of workflowIds) {
			const candidates: Candidate[] = [
				...(activity.get(workflowId) ?? []),
				...(publishes.get(workflowId) ?? []),
				...(versions.get(workflowId) ?? []).flatMap((version) => {
					const userId = resolveAuthor(version.authors, users);
					return userId ? [{ userId, at: version.at }] : [];
				}),
			];
			const newest = candidates
				.filter((candidate) => users.byId.has(candidate.userId))
				.sort((a, b) => b.at.getTime() - a.at.getTime())[0];
			if (newest) latest.set(workflowId, newest.userId);
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

/**
 * A version names its author, not a user. The name counts only when exactly one
 * eligible user carries it.
 */
function resolveAuthor(authors: string, users: EligibleUsers): string | undefined {
	const name = authors.endsWith(MCP_AUTHOR_SUFFIX)
		? authors.slice(0, -MCP_AUTHOR_SUFFIX.length)
		: authors;
	const ids = users.idsByName.get(name);
	return ids?.length === 1 ? ids[0] : undefined;
}

import {
	sharedThreadApprovalScopes,
	type InstanceAiThreadHistoryQuery,
	type InstanceAiThreadHistoryResponse,
	type InstanceAiThreadInfo,
	type InstanceAiThreadListResponse,
} from '@n8n/api-types';
import { UserRepository, type ProjectRelation, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { combineScopes, getAuthPrincipalScopes, type Scope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { renderAuthor } from '../../agents/repositories/agent-history.repository';
import { AgentExecutionThreadRepository } from '../../agents/repositories/agent-execution-thread.repository';
import type { SystemAgentSharingPolicy } from '../../agents/system-agents/system-agent.types';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { ASSISTANT_AGENT_ID, ASSISTANT_TURN_DEFAULTS_KEY } from '../assistant-turn-options';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { withoutStandingApproval } from './teammate-answer';
import {
	canApprove,
	canRead,
	canReadSharedThreads,
	canShare,
	isThreadOwner,
} from './thread-access';

type SharingFields = Pick<InstanceAiThreadInfo, 'sharedWith' | 'owner'>;

/** Thread metadata that only the owner gets. The turn defaults hold the owner's push connection. */
const OWNER_ONLY_METADATA_KEYS: readonly string[] = [ASSISTANT_TURN_DEFAULTS_KEY];

/** The thread as `viewer` may see it: without the owner-only metadata of another user's thread. */
function forViewer(viewer: User, thread: InstanceAiThreadInfo): InstanceAiThreadInfo {
	if (thread.resourceId === viewer.id || !thread.metadata) return thread;
	const metadata = Object.fromEntries(
		Object.entries(thread.metadata).filter(([key]) => !OWNER_ONLY_METADATA_KEYS.includes(key)),
	);
	return { ...thread, metadata };
}

/**
 * Shares Assistant threads with their team project and decides what teammates can do.
 * The owner keeps full use of a shared thread, and every turn runs as the owner.
 */
@Service()
export class ThreadSharingService implements SystemAgentSharingPolicy {
	constructor(
		private readonly threads: AgentExecutionThreadRepository,
		private readonly projectService: ProjectService,
		private readonly users: UserRepository,
		private readonly memory: InstanceAiMemoryService,
	) {}

	/** Share the owner's thread with its team project. Sharing a shared thread again changes nothing. */
	async share(user: User, threadId: string): Promise<InstanceAiThreadInfo> {
		const thread = await this.findThread(threadId);
		if (!thread) throw new NotFoundError('Thread not found');
		if (!isThreadOwner(user, thread)) {
			if (await this.canRead(user, thread)) {
				throw new ForbiddenError('Only the owner can share this chat.');
			}
			throw new NotFoundError('Thread not found');
		}
		const project = await this.projectService.findProject(thread.projectId);
		if (!project) throw new NotFoundError('Thread not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Move this chat to a team project to share it.');
		}
		if (!canShare(user, thread, await this.scopesIn(user, thread.projectId))) {
			throw new ForbiddenError('You need access to this project to share the chat.');
		}
		if (thread.accessScope === 'user') await this.threads.shareWithProject(thread.id, user.id);
		return await this.getThreadInfo(user, thread.id);
	}

	/** Throws NotFoundError unless the user owns the thread or can read it as a teammate. */
	async assertCanRead(
		user: User,
		threadId: string,
		options: { allowNew?: boolean } = {},
	): Promise<void> {
		const thread = await this.threads.findOneBy({ id: threadId });
		if (!thread && options.allowNew) return;
		if (thread?.agentId === ASSISTANT_AGENT_ID && (await this.canRead(user, thread))) return;
		throw new NotFoundError('Thread not found');
	}

	/** The thread summary for `viewer`, with the sharing fields when the thread is shared. */
	async getThreadInfo(viewer: User, threadId: string): Promise<InstanceAiThreadInfo> {
		const [thread] = await this.withSharing(viewer, [await this.memory.getThreadInfo(threadId)]);
		return thread;
	}

	/** The user's threads and the threads shared in the user's team projects. */
	async listThreads(user: User): Promise<InstanceAiThreadListResponse> {
		const projectIds = await this.memberProjectIds(user);
		const list = await this.memory.listThreads(user.id, 0, 100, projectIds);
		return { ...list, threads: await this.withSharing(user, list.threads) };
	}

	async listThreadHistory(
		user: User,
		query: InstanceAiThreadHistoryQuery,
	): Promise<InstanceAiThreadHistoryResponse> {
		const projectIds = await this.memberProjectIds(user);
		const page = await this.memory.listThreadHistory(user.id, query, projectIds);
		return { ...page, threads: await this.withSharing(user, page.threads) };
	}

	// ── Policy for the Agents runtime (users who do not own the thread) ───────

	async canRead(user: User, thread: AgentExecutionThread): Promise<boolean> {
		if (isThreadOwner(user, thread)) return true;
		// Only a shared thread needs the user's scopes in its project.
		if (!isSharedThread(thread)) return false;
		return canRead(user, thread, await this.scopesIn(user, thread.projectId));
	}

	async sendError(_user: User, thread: AgentExecutionThread): Promise<Error> {
		return new ForbiddenError(`Only ${await this.ownerName(thread)} can send messages here.`);
	}

	async authorizeAnswer(
		user: User,
		thread: AgentExecutionThread,
		toolName: string,
		resumeData: unknown,
	): Promise<unknown> {
		const scopes = await this.scopesIn(user, thread.projectId);
		if (!canApprove(user, thread, sharedThreadApprovalScopes(toolName), scopes)) {
			const project = await this.projectService.findProject(thread.projectId);
			throw new ForbiddenError(
				`Only editors in ${project?.name ?? 'this project'} can approve this.`,
			);
		}
		return isThreadOwner(user, thread) ? resumeData : withoutStandingApproval(resumeData);
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private async findThread(threadId: string) {
		return await this.threads.findOneBy({ id: threadId, agentId: ASSISTANT_AGENT_ID });
	}

	/** The user's scopes in a project, global role included. */
	private async scopesIn(user: User, projectId: string): Promise<Scope[]> {
		return await this.projectService.getProjectScopesForUser(user, projectId);
	}

	/** Team projects where the user is a member who can read shared threads. */
	private async memberProjectIds(user: User): Promise<string[]> {
		const relations = await this.projectService.getProjectRelationsForUser(user);
		return relations
			.filter((relation) => relation.project?.type === 'team')
			.filter((relation) => canReadSharedThreads(membershipScopes(user, relation)))
			.map((relation) => relation.projectId);
	}

	private async ownerName(thread: AgentExecutionThread): Promise<string> {
		const owner = thread.ownerId ? await this.users.findOneBy({ id: thread.ownerId }) : null;
		return owner ? renderAuthor(owner) : 'the owner';
	}

	/** Adds `sharedWith` and `owner` to the shared threads of a list, as `viewer` may see them. */
	private async withSharing(
		viewer: User,
		threads: InstanceAiThreadInfo[],
	): Promise<InstanceAiThreadInfo[]> {
		const ids = threads.map(({ id }) => id);
		const shared = await this.threads.findSharedByIds(ASSISTANT_AGENT_ID, ids);
		if (shared.length === 0) return threads;
		const fields = await this.sharingFields(shared);
		return threads.map((thread) => ({ ...forViewer(viewer, thread), ...fields.get(thread.id) }));
	}

	private async sharingFields(shared: AgentExecutionThread[]): Promise<Map<string, SharingFields>> {
		const projectIds = [...new Set(shared.map(({ projectId }) => projectId))];
		const ownerIds = [...new Set(shared.flatMap(({ ownerId }) => (ownerId ? [ownerId] : [])))];
		const [projects, owners] = await Promise.all([
			Promise.all(projectIds.map(async (id) => await this.projectService.findProject(id))),
			this.users.findManyByIds(ownerIds),
		]);
		const projectNames = new Map<string, string>();
		for (const project of projects) if (project) projectNames.set(project.id, project.name);
		const ownerNames = new Map(
			owners.map((owner): [string, string] => [owner.id, renderAuthor(owner)]),
		);
		const fields = new Map<string, SharingFields>();
		for (const thread of shared) {
			const ownerId = thread.ownerId ?? '';
			fields.set(thread.id, {
				sharedWith: {
					projectId: thread.projectId,
					projectName: projectNames.get(thread.projectId) ?? '',
				},
				owner: { id: ownerId, name: ownerNames.get(ownerId) ?? '' },
			});
		}
		return fields;
	}
}

function membershipScopes(user: User, relation: ProjectRelation): Scope[] {
	const project = relation.role.scopes.map((scope) => scope.slug);
	return [...combineScopes({ global: getAuthPrincipalScopes(user), project })];
}

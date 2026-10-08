import {
	canTeammateAnswer,
	InstanceAiConfirmRequestDto,
	sharedThreadApprovalScopes,
} from '@n8n/api-types';
import { UserRepository, type ProjectRelation, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { combineScopes, getAuthPrincipalScopes, type Scope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';

import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { renderAuthor } from '../../agents/repositories/agent-history.repository';
import type {
	SystemAgentPendingCall,
	SystemAgentSharingPolicy,
} from '../../agents/system-agents/system-agent.types';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { withoutStandingApproval } from './teammate-answer';
import {
	canApprove,
	canRead,
	canReadSharedThreads,
	canShare,
	isThreadOwner,
} from './thread-access';

/**
 * Decides what users who do not own an Assistant thread can do with it. The owner keeps
 * full use of a shared thread, and every turn runs as the owner, so a teammate's answer
 * must not do more than the teammate could do without the owner.
 */
@Service()
export class SharedThreadPolicy implements SystemAgentSharingPolicy {
	constructor(
		private readonly projectService: ProjectService,
		private readonly users: UserRepository,
		private readonly workflowFinder: WorkflowFinderService,
	) {}

	async canRead(user: User, thread: AgentExecutionThread): Promise<boolean> {
		if (isThreadOwner(user, thread)) return true;
		// Only a shared thread needs the user's scopes in its project.
		if (!isSharedThread(thread)) return false;
		return canRead(user, thread, await this.scopesIn(user, thread.projectId));
	}

	async sendError(_user: User, thread: AgentExecutionThread): Promise<Error> {
		return new ForbiddenError(`Only ${await this.ownerName(thread)} can send messages here.`);
	}

	/**
	 * A teammate answers a card only as an editor of the project (and of the workflow that the
	 * card is about), and only with a decision. "Always allow" from a teammate counts once.
	 */
	async authorizeAnswer(
		user: User,
		thread: AgentExecutionThread,
		call: SystemAgentPendingCall,
		resumeData: unknown,
	): Promise<unknown> {
		if (isThreadOwner(user, thread)) return resumeData;
		const requiredScopes = sharedThreadApprovalScopes(call.toolName);
		const scopes = await this.scopesIn(user, thread.projectId);
		if (!canApprove(user, thread, requiredScopes, scopes)) {
			const project = await this.projectService.findProject(thread.projectId);
			throw new ForbiddenError(
				`Only editors in ${project?.name ?? 'this project'} can approve this.`,
			);
		}
		const answer = InstanceAiConfirmRequestDto.safeParse(resumeData);
		if (!answer.success || !canTeammateAnswer(answer.data)) {
			throw new ForbiddenError(`Only ${await this.ownerName(thread)} can answer this.`);
		}
		await this.assertCanChangeWorkflow(user, call.input, requiredScopes);
		return withoutStandingApproval(answer.data);
	}

	/**
	 * Only the owner shares, and only into a team project where the owner can read shared
	 * threads. A reader learns that only the owner shares. Anyone else gets 404.
	 */
	async assertCanShare(user: User, thread: AgentExecutionThread): Promise<void> {
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
	}

	/** Team projects where the user can read the threads that other owners shared. */
	async readableProjectIds(user: User): Promise<string[]> {
		const relations = await this.projectService.getProjectRelationsForUser(user);
		return relations
			.filter((relation) => relation.project?.type === 'team')
			.filter((relation) => canReadSharedThreads(membershipScopes(user, relation)))
			.map((relation) => relation.projectId);
	}

	/** The user's scopes in a project, global role included. */
	private async scopesIn(user: User, projectId: string): Promise<Scope[]> {
		return await this.projectService.getProjectScopesForUser(user, projectId);
	}

	private async ownerName(thread: AgentExecutionThread): Promise<string> {
		const owner = thread.ownerId ? await this.users.findOneBy({ id: thread.ownerId }) : null;
		return owner ? renderAuthor(owner) : 'the owner';
	}

	/**
	 * The answer acts as the owner, who can reach workflows outside the project. A card about
	 * a workflow therefore needs the same scopes on that workflow as on the project.
	 */
	private async assertCanChangeWorkflow(user: User, input: unknown, scopes: Scope[]) {
		const workflowId = isRecord(input) ? input.workflowId : undefined;
		if (typeof workflowId !== 'string') return;
		if (!(await this.workflowFinder.findWorkflowHeadForUser(workflowId, user, scopes))) {
			throw new ForbiddenError('Only editors of this workflow can approve this.');
		}
	}
}

function membershipScopes(user: User, relation: ProjectRelation): Scope[] {
	const project = relation.role.scopes.map((scope) => scope.slug);
	return [...combineScopes({ global: getAuthPrincipalScopes(user), project })];
}

import {
	InstanceAiConfirmRequestDto,
	sharedCardRule,
	type InstanceAiConfirmRequest,
	type SharedCardRule,
	type SharedCardTarget,
} from '@n8n/api-types';
import { UserRepository, type ProjectRelation, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { combineScopes, getAuthPrincipalScopes, type Scope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { renderAuthor } from '../../agents/repositories/agent-history.repository';
import type {
	SystemAgentPendingCall,
	SystemAgentSharingPolicy,
} from '../../agents/system-agents/system-agent.types';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { SharedCardAccess } from './shared-card-access';
import { withoutStandingApproval } from './teammate-answer';
import {
	canApprove,
	canRead,
	canReadSharedThreads,
	canShare,
	isThreadOwner,
} from './thread-access';

const TARGET_NAMES: Readonly<Record<SharedCardTarget['type'], string>> = {
	workflow: 'workflow',
	credential: 'credential',
	dataTable: 'data table',
	project: 'project',
};

/** A teammate's answer that a card rule allows. */
interface TeammateAnswer {
	answer: InstanceAiConfirmRequest;
	rule: SharedCardRule;
}

/**
 * Decides what users who do not own an Assistant thread can do with it. The owner keeps
 * full use of a shared thread, and every turn runs as the owner, so a teammate's answer
 * must not do more than the teammate could do without the owner. Only members of the
 * thread's project are teammates: a global role alone does not make a reader.
 */
@Service()
export class SharedThreadPolicy implements SystemAgentSharingPolicy {
	constructor(
		private readonly projectService: ProjectService,
		private readonly users: UserRepository,
		private readonly cardAccess: SharedCardAccess,
	) {}

	async canRead(user: User, thread: AgentExecutionThread): Promise<boolean> {
		if (isThreadOwner(user, thread)) return true;
		// Only a shared thread needs the user's scopes in its project.
		if (!isSharedThread(thread)) return false;
		return canRead(user, thread, await this.memberScopes(user, thread.projectId));
	}

	async sendError(_user: User, thread: AgentExecutionThread): Promise<Error> {
		return new ForbiddenError(`Only ${await this.ownerName(thread)} can send messages here.`);
	}

	/**
	 * A teammate answers only a card that a card rule lists, only with a decision, and only
	 * with the rule's scopes in the project and on the resource of the card. "Always allow"
	 * from a teammate counts once.
	 */
	async authorizeAnswer(
		user: User,
		thread: AgentExecutionThread,
		call: SystemAgentPendingCall,
		resumeData: unknown,
	): Promise<unknown> {
		if (isThreadOwner(user, thread)) return resumeData;
		const teammateAnswer = teammateAnswerFor(call, resumeData, thread.projectId);
		if (!teammateAnswer) {
			throw new ForbiddenError(`Only ${await this.ownerName(thread)} can answer this.`);
		}
		const { answer, rule } = teammateAnswer;
		const scopes = await this.memberScopes(user, thread.projectId);
		if (!canApprove(user, thread, rule.scopes, scopes)) {
			const project = await this.projectService.findProject(thread.projectId);
			throw new ForbiddenError(
				`Only editors in ${project?.name ?? 'this project'} can approve this.`,
			);
		}
		if (!(await this.cardAccess.canAnswer(user, rule))) {
			throw new ForbiddenError(
				`Only editors of this ${TARGET_NAMES[rule.target.type]} can approve this.`,
			);
		}
		return withoutStandingApproval(answer);
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
		if (!canShare(user, thread, await this.memberScopes(user, thread.projectId))) {
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

	/** The user's scopes in a project that the user is a member of, global role included. */
	private async memberScopes(user: User, projectId: string): Promise<Scope[]> {
		const relation = await this.projectService.getProjectRelationForUserAndProject(
			user.id,
			projectId,
		);
		return relation ? membershipScopes(user, relation) : [];
	}

	private async ownerName(thread: AgentExecutionThread): Promise<string> {
		const owner = thread.ownerId ? await this.users.findOneBy({ id: thread.ownerId }) : null;
		return owner ? renderAuthor(owner) : 'the owner';
	}
}

/** The answer and the card rule that let a teammate give it, or undefined for the owner only. */
function teammateAnswerFor(
	call: SystemAgentPendingCall,
	resumeData: unknown,
	projectId: string,
): TeammateAnswer | undefined {
	const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
	if (!parsed.success) return undefined;
	const rule = sharedCardRule(call, parsed.data, projectId);
	return rule ? { answer: parsed.data, rule } : undefined;
}

function membershipScopes(user: User, relation: Pick<ProjectRelation, 'role'>): Scope[] {
	const project = relation.role.scopes.map((scope) => scope.slug);
	return [...combineScopes({ global: getAuthPrincipalScopes(user), project })];
}

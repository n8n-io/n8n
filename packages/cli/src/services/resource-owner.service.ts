import { ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { OperationContext, User } from '@n8n/db';
import { ProjectRelationRepository, UserRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope, PROJECT_ADMIN_ROLE_SLUG, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';

import type { OwnerChangeReason } from '@/events/maps/relay.event-map';
import { userHasScopes } from '@/permissions.ee/check-access';

type OwnedResourceType = 'workflow' | 'agent';

type OwnedResourceStore = Pick<WorkflowRepository, 'findOwners' | 'findOwnedBy' | 'setOwnerUserId'>;

type OwnerReplacement = {
	type: OwnedResourceType;
	resources: Array<{ id: string; ownerUserId: string | null }>;
	projectId: string;
	actor: User | undefined;
	reason: OwnerChangeReason;
	leavingUserId?: string;
};

type OwnerChange = {
	type: OwnedResourceType;
	id: string;
	projectId: string;
	actor: User | undefined;
	previousOwnerUserId: string | null;
	newOwnerUserId: string | null;
	reason: OwnerChangeReason;
};

@Service()
export class ResourceOwnerService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly userRepository: UserRepository,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly eventService: EventService,
	) {}

	async setOwner(
		actor: User,
		resource: { type: OwnedResourceType; id: string },
		newOwnerUserId: string | null,
	) {
		const store = await this.storeFor(resource.type);
		const [current] = (await store?.findOwners([resource.id], {})) ?? [];
		if (!current) throw new NotFoundError(`Could not find the ${resource.type}`);

		const canManageOwner = await userHasScopes(
			actor,
			[`${resource.type}:manageOwner`],
			false,
			resource.type === 'workflow' ? { workflowId: resource.id } : { agentId: resource.id },
		);
		const isHandOver = actor.id === current.ownerUserId && newOwnerUserId !== null;
		if (!canManageOwner && !isHandOver) {
			throw new ForbiddenError(`You cannot change the owner of this ${resource.type}`);
		}

		if (newOwnerUserId !== null) {
			const validOwnerIds = await this.findValidOwnerIds([newOwnerUserId], current.projectId, {});
			if (!validOwnerIds.has(newOwnerUserId)) {
				throw new BadRequestError('The owner must be a person who is a member of the project');
			}
		}

		if (newOwnerUserId === current.ownerUserId) return;

		await store?.setOwnerUserId([resource.id], newOwnerUserId, {});
		this.emitOwnerChanged({
			type: resource.type,
			id: resource.id,
			projectId: current.projectId,
			actor,
			previousOwnerUserId: current.ownerUserId,
			newOwnerUserId,
			reason: 'manual',
		});
	}

	async ownerForNewResource(
		creator: { id: string } | undefined,
		projectId: string,
		type: OwnedResourceType,
		ctx: OperationContext,
	) {
		if (creator && (await this.findValidOwnerIds([creator.id], projectId, ctx)).has(creator.id)) {
			return creator.id;
		}
		// A creator who is not a valid owner also fails the actor step of the fallback.
		return await this.resolveFallbackOwner(undefined, projectId, type, ctx);
	}

	async reconcileAfterMove(
		actor: User,
		workflowIds: string[],
		destinationProjectId: string,
		ctx: OperationContext,
	) {
		const workflows = await this.workflowRepository.findOwners(workflowIds, ctx);
		const ownerUserIds = [...new Set(workflows.flatMap(({ ownerUserId }) => ownerUserId ?? []))];
		const validOwnerIds = await this.findValidOwnerIds(ownerUserIds, destinationProjectId, ctx);

		await this.replaceOwner(
			{
				type: 'workflow',
				resources: workflows.filter(
					({ ownerUserId }) => ownerUserId === null || !validOwnerIds.has(ownerUserId),
				),
				projectId: destinationProjectId,
				actor,
				reason: 'move',
			},
			ctx,
		);
	}

	async reassignOwnedBy(
		leaving: {
			userId: string;
			projectId?: string;
			actor: User | undefined;
			reason: OwnerChangeReason;
		},
		ctx: OperationContext,
	) {
		for (const type of ['workflow', 'agent'] as const) {
			const store = await this.storeFor(type);
			const owned = (await store?.findOwnedBy(leaving.userId, ctx, leaving.projectId)) ?? [];
			const homeProjectIds = new Set(owned.map(({ projectId }) => projectId));

			for (const projectId of homeProjectIds) {
				const staysValidOwner =
					leaving.reason !== 'user-deleted' &&
					(await this.findValidOwnerIds([leaving.userId], projectId, ctx)).has(leaving.userId);
				if (staysValidOwner) continue;

				await this.replaceOwner(
					{
						type,
						resources: owned
							.filter((resource) => resource.projectId === projectId)
							.map(({ id }) => ({ id, ownerUserId: leaving.userId })),
						projectId,
						actor: leaving.actor,
						reason: leaving.reason,
						leavingUserId: leaving.userId,
					},
					ctx,
				);
			}
		}
	}

	private async findValidOwnerIds(userIds: string[], projectId: string, ctx: OperationContext) {
		return new Set(
			await this.projectRelationRepository.findPersonMemberIds(projectId, userIds, ctx),
		);
	}

	private async resolveFallbackOwner(
		actor: User | undefined,
		projectId: string,
		type: OwnedResourceType,
		ctx: OperationContext,
		leavingUserId?: string,
	) {
		const findPersonIdsWithRole = async (roleSlug: string) =>
			await this.projectRelationRepository.findPersonIdsWithRole(
				projectId,
				roleSlug,
				ctx,
				leavingUserId,
			);

		const personalProjectOwnerIds = await findPersonIdsWithRole(PROJECT_OWNER_ROLE_SLUG);
		if (personalProjectOwnerIds.length === 1) return personalProjectOwnerIds[0];

		if (
			actor &&
			actor.id !== leavingUserId &&
			(await this.canTakeOwnership(actor, projectId, type, ctx))
		) {
			return actor.id;
		}

		const projectAdminIds = await findPersonIdsWithRole(PROJECT_ADMIN_ROLE_SLUG);
		if (projectAdminIds.length > 0) return projectAdminIds[0];

		return await this.findInstanceOwnerIfValidOwner(projectId, ctx, leavingUserId);
	}

	private async findInstanceOwnerIfValidOwner(
		projectId: string,
		ctx: OperationContext,
		leavingUserId?: string,
	) {
		const instanceOwnerId = await this.userRepository.findInstanceOwnerId(ctx);
		if (instanceOwnerId === null || instanceOwnerId === leavingUserId) return null;

		const validOwnerIds = await this.findValidOwnerIds([instanceOwnerId], projectId, ctx);
		return validOwnerIds.has(instanceOwnerId) ? instanceOwnerId : null;
	}

	private async canTakeOwnership(
		actor: User,
		projectId: string,
		type: OwnedResourceType,
		ctx: OperationContext,
	) {
		if (!(await this.findValidOwnerIds([actor.id], projectId, ctx)).has(actor.id)) return false;

		const scope = `${type}:manageOwner` as const;
		return (
			hasGlobalScope(actor, scope) ||
			(await this.projectRelationRepository.hasScopeInProject(actor.id, projectId, scope, ctx))
		);
	}

	private async replaceOwner(
		{ type, resources, projectId, actor, reason, leavingUserId }: OwnerReplacement,
		ctx: OperationContext,
	) {
		if (resources.length === 0) return;

		const newOwnerUserId = await this.resolveFallbackOwner(
			actor,
			projectId,
			type,
			ctx,
			leavingUserId,
		);
		const changed = resources.filter(({ ownerUserId }) => ownerUserId !== newOwnerUserId);
		const store = await this.storeFor(type);
		await store?.setOwnerUserId(
			changed.map(({ id }) => id),
			newOwnerUserId,
			ctx,
		);

		for (const { id, ownerUserId } of changed) {
			this.emitOwnerChanged({
				type,
				id,
				projectId,
				actor,
				previousOwnerUserId: ownerUserId,
				newOwnerUserId,
				reason,
			});
		}
	}

	private async storeFor(type: OwnedResourceType): Promise<OwnedResourceStore | undefined> {
		if (type === 'workflow') return this.workflowRepository;
		if (!this.moduleRegistry.isActive('agents')) return undefined;

		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		return Container.get(AgentRepository);
	}

	private emitOwnerChanged({ type, id, actor, ...change }: OwnerChange) {
		const event = { ...change, user: actor ?? null };
		if (type === 'workflow') {
			this.eventService.emit('workflow-owner-changed', { ...event, workflowId: id });
			return;
		}
		this.eventService.emit('agent-owner-changed', { ...event, agentId: id });
	}
}

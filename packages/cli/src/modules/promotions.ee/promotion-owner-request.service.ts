import type {
	CreatePromotionOwnerRequestDto,
	InboxCounts,
	InboxPromotionOwnerRequestItem,
	PromotionDirection,
	PromotionOwnerRequestResult,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	accountSummary,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { singleFlight } from '@n8n/utils/promise/single-flight';
import { getStaticSubworkflowId, type INode, type IWorkflowSettings } from 'n8n-workflow';

import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';
import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionOwnerRequest } from './database/entities/promotion-owner-request.entity';
import { PromotionEnvironmentProjectRepository } from './database/repositories/promotion-environment-project.repository';
import {
	PromotionOwnerRequestRepository,
	type OwnerRequestRecipientScope,
	type OwnerRequestResource,
} from './database/repositories/promotion-owner-request.repository';
import { TargetLookupService } from './dependency-check/target-lookup.service';
import { GitCommitPackageReader } from './git-commit-package-reader';
import { PromotionAccessService } from './promotion-access.service';
import { PromotionEnvironmentResolver } from './promotion-environment.resolver';
import { PromotionsService } from './promotions.service';
import type { PromotionOperationInput } from './promotions.types';

const SENT: PromotionOwnerRequestResult = { status: 'sent' };

/** A read of the branch fetches from the remote, so the sweep reads each branch at most this often. */
const BRANCH_SWEEP_INTERVAL_MS = 60_000;

/** One message for every refusal, so the answer does not say which check failed. */
const NOT_ALLOWED = 'You cannot ask the owner from this workflow.';

type WorkflowContent = { nodes?: INode[]; settings?: IWorkflowSettings };

/** What the workflow of the requester says about the target. */
type HeldReference = { name: string | null; credentialType: string | null };

/** The consumer workflow and the owner of the target, as the source of the operation holds them. */
type ResolvedRequest = {
	consumerProjectId: string;
	consumer: WorkflowContent;
	/** `undefined`: the source does not hold the target in a team project. */
	owner: { projectId: string | null; resourceName: string | null } | undefined;
};

export const ownerRequestResourceKey = ({ kind, id }: OwnerRequestResource) => `${kind}:${id}`;

/**
 * "Ask the owner": a user who cannot promote or apply the project of a dependency asks the
 * owner project to do it. The requester never learns anything about the owner project.
 *
 * A request goes to the users who can run its operation in the owner project (a project admin,
 * or a user with the global promotion scope). When the owner project is not on this instance,
 * only a user with the global scope receives it.
 */
@Service()
export class PromotionOwnerRequestService {
	private readonly sweepOnce = singleFlight(async () => await this.closeSatisfiedRequests());

	/** When the sweep last read the branch of each promote environment. */
	private readonly branchSweptAt = new Map<string, number>();

	constructor(
		private readonly licenseState: LicenseState,
		private readonly sourceControlPreferences: SourceControlPreferencesService,
		private readonly requestRepository: PromotionOwnerRequestRepository,
		private readonly resolver: PromotionEnvironmentResolver,
		private readonly access: PromotionAccessService,
		private readonly promotions: PromotionsService,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly linkRepository: PromotionEnvironmentProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly targetLookup: TargetLookupService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	isEnabled() {
		return (
			this.licenseState.isLicensed(LICENSE_FEATURES.PROMOTIONS) &&
			this.sourceControlPreferences.getPreferences().environmentsVersion === 'v2'
		);
	}

	// -- Requester -------------------------------------------------------------

	/**
	 * Sends the request. The answer is always `sent`: it never says whether the target exists,
	 * who owns it, or who received the request. A request that has no owner to go to is logged
	 * and not stored.
	 */
	async create(
		user: User,
		environmentId: string,
		{ target, consumerWorkflowId }: CreatePromotionOwnerRequestDto,
		apiKeyScopes: readonly string[],
	): Promise<PromotionOwnerRequestResult> {
		const input = await this.resolver.resolveForEnvironment(environmentId);
		const { direction } = input.config;

		// The route accepts a key with either scope. The environment decides which one it needs.
		const keyScope = `promotions:${direction}`;
		if (!apiKeyScopes.includes(keyScope)) {
			throw new ForbiddenError(`A ${direction} environment requires the ${keyScope} scope`);
		}

		// A user with no project to operate never makes n8n read the branch.
		if ((await this.access.operableProjectIds(user, direction)).size === 0) {
			throw new ForbiddenError(NOT_ALLOWED);
		}

		const resolved =
			direction === 'promote'
				? await this.resolveOnInstance(target, consumerWorkflowId)
				: await this.resolveOnBranch(input, target, consumerWorkflowId);
		if (!resolved) throw new ForbiddenError(NOT_ALLOWED);

		const { consumerProjectId, consumer, owner } = resolved;
		const canOperateConsumer =
			(await this.access.canOperate(user, consumerProjectId, direction)) &&
			(await this.access.environmentCovers(input, consumerProjectId));
		if (!canOperateConsumer) throw new ForbiddenError(NOT_ALLOWED);

		// The user can read this workflow, so this answer gives nothing away.
		const held = heldReference(consumer, target);
		if (!held) throw new BadRequestError('The workflow does not reference this resource.');

		const context = { environmentId, direction, resourceKind: target.kind, resourceId: target.id };
		if (!owner) {
			this.logger.info('Owner request not stored: the target has no owner team project', context);
			return SENT;
		}
		// A request is for a gap that the owner can close in this environment. The environment
		// must cover the owner project, else its Promote or Apply cannot write the target here.
		if (
			owner.projectId !== null &&
			!(await this.access.environmentCovers(input, owner.projectId))
		) {
			this.logger.info(
				'Owner request not stored: the environment does not cover the owner project',
				context,
			);
			return SENT;
		}
		const requesterIsRecipient =
			this.access.hasGlobalRight(user, direction) ||
			(owner.projectId !== null &&
				(await this.access.canOperate(user, owner.projectId, direction)));
		if (requesterIsRecipient) {
			this.logger.info('Owner request not stored: the requester can operate the owner', context);
			return SENT;
		}

		await this.requestRepository.insertIfAbsent({
			environmentId,
			direction,
			resourceKind: target.kind,
			resourceId: target.id,
			resourceName: owner.resourceName ?? held.name ?? target.id,
			credentialType: held.credentialType,
			ownerProjectId: owner.projectId,
			requesterId: user.id,
			consumerWorkflowId,
		});
		return SENT;
	}

	/**
	 * The targets that the user already asked for in this environment and operation, as
	 * `<kind>:<id>` keys. The dependency report shows "Request sent" (`ownerRequestSent`) for them.
	 */
	async findSentRequestKeys(
		user: User,
		environmentId: string,
		direction: PromotionDirection,
	): Promise<Set<string>> {
		const resources = await this.requestRepository.findOpenResourcesByRequester(
			user.id,
			environmentId,
			direction,
		);
		return new Set(resources.map(ownerRequestResourceKey));
	}

	// -- Recipient -------------------------------------------------------------

	async listForInbox(
		user: User,
		query: InboxSourceQuery,
	): Promise<InboxPromotionOwnerRequestItem[]> {
		const scope = await this.recipientScope(user);
		if (!canReceive(scope)) return [];
		// A sweep during "Load more" could move a request above the cursor.
		if (!query.boundary) await this.sweepOnce();
		const requests = await this.requestRepository.findForInbox(query, scope);
		return requests.map(toItem);
	}

	async countForInbox(user: User): Promise<InboxCounts> {
		const scope = await this.recipientScope(user);
		if (!canReceive(scope)) return { open: 0, closed: 0 };
		await this.sweepOnce();
		return await this.requestRepository.countForInbox(scope);
	}

	/** A recipient closes the request. The requester gets no message. */
	async dismiss(user: User, requestId: string): Promise<InboxPromotionOwnerRequestItem> {
		const request = await this.requestRepository.findByIdWithRelations(requestId);
		// A user who is not a recipient gets the answer of a request that does not exist.
		if (!request || !(await this.isRecipient(user, request))) {
			throw new NotFoundError('Request not found');
		}
		const at = new Date();
		if (await this.requestRepository.close(request.id, 'dismissed', at)) {
			request.state = 'closed';
			request.closeReason = 'dismissed';
			request.updatedAt = at;
		}
		return toItem(request);
	}

	// -- Life cycle ------------------------------------------------------------

	/**
	 * Closes the open requests of one environment and operation for resources that the operation
	 * wrote: to the branch (Promote) or to this instance (Apply). Promote and Apply call this after
	 * a successful write. Returns how many requests closed.
	 */
	async closeSatisfied(
		environmentId: string,
		direction: PromotionDirection,
		resources: readonly OwnerRequestResource[],
	): Promise<number> {
		if (resources.length === 0) return 0;
		return await this.requestRepository.closeForResources(
			environmentId,
			direction,
			resources,
			'satisfied',
			new Date(),
		);
	}

	/**
	 * The check that the inbox runs: closes each open request whose resource arrived. An Apply
	 * request reads this instance. A Promote request reads the branch, at most once a minute for
	 * each environment. A failed read closes nothing.
	 */
	private async closeSatisfiedRequests(): Promise<void> {
		try {
			const open = await this.requestRepository.findOpen();
			if (open.length === 0) return;
			const satisfied = [
				...(await this.satisfiedOnInstance(open.filter((r) => r.direction === 'apply'))),
				...(await this.satisfiedOnBranch(open.filter((r) => r.direction === 'promote'))),
			];
			await this.requestRepository.closeMany(satisfied, 'satisfied', new Date());
		} catch (error) {
			this.logger.warn('Could not check the open owner requests', { error });
		}
	}

	private async satisfiedOnInstance(requests: PromotionOwnerRequest[]): Promise<string[]> {
		const idsOf = (kind: OwnerRequestResource['kind']) =>
			requests.filter((r) => r.resourceKind === kind).map((r) => r.resourceId);
		// An owner row exists for each workflow that this instance holds.
		const [credentials, workflows, consumers] = await Promise.all([
			this.targetLookup.credentials(idsOf('credential')),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(idsOf('workflow')),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
				requests.filter((r) => r.resourceKind === 'credential').map((r) => r.consumerWorkflowId),
			),
		]);
		// A credential that the instance holds can still be out of reach of the consumer project.
		// The request then stays open: the owner must apply the credential or share it.
		const credentialSatisfied = (request: PromotionOwnerRequest) => {
			const credential = credentials.get(request.resourceId);
			if (!credential) return false;
			const consumerProjectId = consumers.get(request.consumerWorkflowId)?.id;
			return (
				consumerProjectId === undefined ||
				credential.isGlobal ||
				credential.projectIds.includes(consumerProjectId)
			);
		};
		return requests
			.filter((r) =>
				r.resourceKind === 'credential' ? credentialSatisfied(r) : workflows.has(r.resourceId),
			)
			.map(({ id }) => id);
	}

	private async satisfiedOnBranch(requests: PromotionOwnerRequest[]): Promise<string[]> {
		const satisfied: string[] = [];
		const now = Date.now();
		const due = new Set<string>();
		for (const { environmentId } of requests) {
			if (now - (this.branchSweptAt.get(environmentId) ?? 0) < BRANCH_SWEEP_INTERVAL_MS) continue;
			this.branchSweptAt.set(environmentId, now);
			due.add(environmentId);
		}

		for (const environmentId of due) {
			const ofEnvironment = requests.filter((r) => r.environmentId === environmentId);
			const projectIds = new Set(ofEnvironment.flatMap((r) => r.ownerProjectId ?? []));
			for (const projectId of projectIds) {
				const ofProject = ofEnvironment.filter((r) => r.ownerProjectId === projectId);
				try {
					const branch = await this.promotions.readBranchPackage(projectId, 'promote');
					// The project can use another promote environment now. Its branch says nothing here.
					if (branch.environmentId !== environmentId) continue;
					const onBranch = new Set(branch.files.map((file) => `${file.type}:${file.entityId}`));
					for (const request of ofProject) {
						if (onBranch.has(`${request.resourceKind}:${request.resourceId}`)) {
							satisfied.push(request.id);
						}
					}
				} catch (error) {
					this.logger.debug('Could not read the branch for the open owner requests', {
						environmentId,
						error,
					});
				}
			}
		}
		return satisfied;
	}

	// -- Resolution ------------------------------------------------------------

	/** Promote: this instance is the source. The owner is the project that owns the target here. */
	private async resolveOnInstance(
		target: OwnerRequestResource,
		consumerWorkflowId: string,
	): Promise<ResolvedRequest | null> {
		const consumer = await this.workflowRepository.findById(consumerWorkflowId);
		const consumerProject = consumer?.shared?.find(({ role }) => role === 'workflow:owner');
		if (!consumer || !consumerProject) return null;

		const ownerProject =
			target.kind === 'credential'
				? await this.sharedCredentialsRepository.findCredentialOwningProject(target.id)
				: await this.sharedWorkflowRepository.getWorkflowOwningProject(target.id);
		// A personal resource never goes to the branch, so there is no owner to ask.
		if (ownerProject?.type !== 'team') {
			return { consumerProjectId: consumerProject.projectId, consumer, owner: undefined };
		}

		let resourceName: string | null = null;
		if (target.kind === 'workflow') {
			const [workflow] = await this.workflowRepository.findByIds([target.id], { fields: ['name'] });
			resourceName = workflow?.name ?? null;
		}
		return {
			consumerProjectId: consumerProject.projectId,
			consumer,
			owner: { projectId: ownerProject.id, resourceName },
		};
	}

	/**
	 * Apply: the branch is the source. The owner is the project folder on the branch that holds
	 * the target, when that project is a team project of this instance.
	 */
	private async resolveOnBranch(
		input: PromotionOperationInput,
		target: OwnerRequestResource,
		consumerWorkflowId: string,
	): Promise<ResolvedRequest | null> {
		const inventory = await this.readBranchInventory(input);
		const consumer = inventory?.workflows.find(({ id }) => id === consumerWorkflowId);
		if (!inventory || !consumer) return null;

		// A credential that this instance holds: its owner project here can share it with the
		// consumer project. So the request for an access that the user cannot grant goes there.
		if (target.kind === 'credential') {
			const destinationOwner = await this.sharedCredentialsRepository.findCredentialOwningProject(
				target.id,
			);
			if (destinationOwner?.type === 'team') {
				return {
					consumerProjectId: consumer.projectId,
					consumer: consumer.content,
					owner: { projectId: destinationOwner.id, resourceName: null },
				};
			}
		}

		const held =
			target.kind === 'credential'
				? inventory.credentials.find(({ credential }) => credential.id === target.id)
				: inventory.workflows.find(({ id }) => id === target.id);
		const branchProjectId = held?.projectId ?? null;
		if (!held || branchProjectId === null) {
			return {
				consumerProjectId: consumer.projectId,
				consumer: consumer.content,
				owner: undefined,
			};
		}

		const [onInstance] = await this.projectRepository.findTeamProjectInfoByIds([branchProjectId]);
		return {
			consumerProjectId: consumer.projectId,
			consumer: consumer.content,
			owner: {
				projectId: onInstance?.id ?? null,
				resourceName: 'credential' in held ? held.credential.name : held.name,
			},
		};
	}

	/** The whole package at the tip of the Apply branch. `null` when the branch holds none. */
	private async readBranchInventory(
		input: PromotionOperationInput,
	): Promise<PackageDirectoryInventory | null> {
		let files: Map<string, Buffer>;
		if (input.scope === 'instance') {
			({ files } = await this.promotions.readInstanceApplyPackage(input.environmentId));
		} else {
			// Any project of the environment reads the same branch.
			const [projectId] = await this.linkRepository.findProjectIdsByEnvironment(
				input.environmentId,
			);
			if (!projectId) return null;
			const { commitSha } = await this.promotions.readBranchPackage(projectId, 'apply');
			if (commitSha === null) return null;
			files = await this.promotions.readApplyPackageAtCommit(projectId, commitSha);
		}
		if (files.size === 0) return null;
		return await this.inventoryReader.read(new GitCommitPackageReader(files));
	}

	// -- Recipients ------------------------------------------------------------

	private async recipientScope(user: User): Promise<OwnerRequestRecipientScope> {
		const scopeOf = async (direction: PromotionDirection) =>
			this.access.hasGlobalRight(user, direction)
				? { all: true, projectIds: [] }
				: { all: false, projectIds: [...(await this.access.operableProjectIds(user, direction))] };
		return { promote: await scopeOf('promote'), apply: await scopeOf('apply') };
	}

	private async isRecipient(user: User, request: PromotionOwnerRequest): Promise<boolean> {
		if (this.access.hasGlobalRight(user, request.direction)) return true;
		if (request.ownerProjectId === null) return false;
		return await this.access.canOperate(user, request.ownerProjectId, request.direction);
	}
}

const canReceive = (scope: OwnerRequestRecipientScope) =>
	Object.values(scope).some(({ all, projectIds }) => all || projectIds.length > 0);

/**
 * What the workflow holds about the target, read from the nodes without an execution. `null`
 * when the workflow does not reference the target.
 */
function heldReference(
	{ nodes, settings }: WorkflowContent,
	target: OwnerRequestResource,
): HeldReference | null {
	if (target.kind === 'credential') {
		let held: HeldReference | null = null;
		visitWorkflowCredentials(nodes, (credentialType, details) => {
			if (details.id === target.id) held ??= { name: details.name, credentialType };
			return false;
		});
		return held;
	}

	const { errorWorkflow } = settings ?? {};
	const references =
		errorWorkflow === target.id ||
		(nodes ?? []).some((node) => getStaticSubworkflowId(node) === target.id);
	return references ? { name: null, credentialType: null } : null;
}

/** The item never holds the workflow or the project of the requester. */
const toItem = (request: PromotionOwnerRequest): InboxPromotionOwnerRequestItem => {
	const resource = { kind: request.resourceKind, id: request.resourceId };
	return {
		type: 'promotion_owner_request',
		id: request.id,
		state: request.state,
		resource: {
			...resource,
			name: request.resourceName,
			...(request.credentialType ? { credentialType: request.credentialType } : {}),
		},
		resourceKey: ownerRequestResourceKey(resource),
		...(request.ownerProject
			? { ownerProject: { id: request.ownerProject.id, name: request.ownerProject.name } }
			: {}),
		requester: accountSummary(request.requester),
		operation: request.direction,
		environment: { id: request.environmentId, name: request.environment.name },
		...(request.closeReason ? { closeReason: request.closeReason } : {}),
		createdAt: request.createdAt.toISOString(),
		updatedAt: request.updatedAt.toISOString(),
	};
};

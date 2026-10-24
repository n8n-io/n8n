import type {
	ScimConfigResponse,
	ScimDeprovisioningPolicy,
	ScimTransferTarget,
	ScimTransferTargetsQueryDto,
	ScimTransferTargetsResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, type Project, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { PolicyViolationError } from '@/policy/policy-violation.error';
import { OwnershipService } from '@/services/ownership.service';
import { UserService } from '@/services/user.service';

import { ScimTransferTargetRepository } from './database/scim-transfer-target.repository';
import { ScimSettingsService } from './scim-settings.service';
import { ScimForbiddenError, ScimInvalidTransferTargetError } from './scim.errors';

type TransferTargetProject = Pick<Project, 'type'> & {
	creator?: Pick<User, 'disabled'> | null;
};

/**
 * The one rule for a valid transfer target: a team project, with or without
 * members, or the personal project of an active user.
 * `ScimTransferTargetRepository` applies the same rule in SQL for the picker.
 */
export function isValidScimTransferTarget(project: TransferTargetProject): boolean {
	if (project.type === 'team') return true;

	return !!project.creator && !project.creator.disabled;
}

/** The stored target as the settings page shows it. `project` is null when it no longer exists. */
export function toScimTransferTarget(
	projectId: string,
	project: Project | null,
): ScimTransferTarget {
	if (!project) return { projectId, kind: null, name: null, valid: false };

	const valid = isValidScimTransferTarget(project);

	if (project.type === 'team') {
		return { projectId, kind: 'project', name: project.name, icon: project.icon, valid };
	}

	const { creator } = project;
	const fullName = [creator?.firstName, creator?.lastName].filter(Boolean).join(' ');
	return {
		projectId,
		kind: 'person',
		name: fullName || creator?.email || project.name,
		email: creator?.email,
		valid,
	};
}

/**
 * Stores the SCIM deprovisioning policy and applies it when the identity
 * provider deletes a user. Only `DELETE /scim/v2/Users/:id` uses the policy.
 * PATCH and PUT with `active: false` always deactivate the user.
 */
@Service()
export class ScimDeprovisioningService {
	constructor(
		private readonly logger: Logger,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly transferTargetRepository: ScimTransferTargetRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
	) {}

	async getPolicy(): Promise<ScimDeprovisioningPolicy> {
		return await this.scimSettingsService.getDeprovisioningPolicy();
	}

	/** The policy and its transfer target, for `GET /rest/scim/config`. */
	async describePolicy(): Promise<
		Pick<ScimConfigResponse, 'onDelete' | 'dataAction' | 'transferTarget'>
	> {
		const { onDelete, dataAction, transferProjectId } = await this.getPolicy();
		const transferTarget = transferProjectId
			? toScimTransferTarget(transferProjectId, await this.findTarget(transferProjectId))
			: null;

		return { onDelete, dataAction, transferTarget };
	}

	/**
	 * The people and the team projects that the transfer target picker shows.
	 * `skip` and `take` apply to each section separately. `type` limits the
	 * response to one section.
	 */
	async findTransferTargets({
		search,
		type,
		skip,
		take,
	}: ScimTransferTargetsQueryDto): Promise<ScimTransferTargetsResponse> {
		const page = { search, skip, take };
		const [people, projects] = await Promise.all([
			type === 'projects' ? undefined : this.transferTargetRepository.findPersonTargetPage(page),
			type === 'people' ? undefined : this.transferTargetRepository.findProjectTargetPage(page),
		]);

		return { ...(people && { people }), ...(projects && { projects }) };
	}

	/**
	 * Deletes the user. With `dataAction: transfer`, the work goes to the
	 * transfer target first. Otherwise it is deleted with the personal project
	 * of the user. A policy that blocks the transfer gives a SCIM 403. The
	 * caller refuses the instance owner and does not call this for an admin.
	 * The caller deactivates the user before this runs, so a failed delete
	 * leaves the user deactivated.
	 */
	async deleteUser(user: User, policy: ScimDeprovisioningPolicy): Promise<void> {
		const transferProjectId =
			policy.dataAction === 'transfer'
				? await this.resolveTransferProjectId(user, policy.transferProjectId)
				: undefined;

		try {
			await this.userService.deleteUser(
				{ kind: 'system', reason: 'scim' },
				user.id,
				transferProjectId,
			);
		} catch (error) {
			if (error instanceof PolicyViolationError) throw new ScimForbiddenError(error.message);
			throw error;
		}

		this.logger.info('SCIM: User deleted', {
			userId: user.id,
			dataAction: policy.dataAction,
			transferProjectId,
		});
	}

	/**
	 * Throws `ScimInvalidTransferTargetError` when the project cannot be the
	 * transfer target. Call it before the policy is saved, so that a rejected
	 * change saves nothing.
	 */
	async assertValidTransferTarget(projectId: string) {
		const project = await this.findTarget(projectId);

		if (!project || !isValidScimTransferTarget(project)) {
			throw new ScimInvalidTransferTargetError(
				'The transfer target must be a team project or the personal project of an active user.',
			);
		}
	}

	/**
	 * The stored target can become unusable after an admin saved it. The work
	 * must not be lost, so it then goes to the personal project of the owner.
	 */
	private async resolveTransferProjectId(user: User, storedId: string | null): Promise<string> {
		const target = storedId ? await this.findTarget(storedId) : null;
		// The personal project of the deleted user is deleted with the user.
		const isOwnProject = target?.type === 'personal' && target.creatorId === user.id;
		if (target && !isOwnProject && isValidScimTransferTarget(target)) return target.id;

		if (storedId) {
			this.logger.warn(
				'SCIM: The transfer target is not valid. The work of the deleted user goes to the personal project of the owner.',
				{ userId: user.id, transferProjectId: storedId },
			);
		}

		const owner = await this.ownershipService.getInstanceOwner();
		const ownerProject = await this.projectRepository.getPersonalProjectForUserOrFail(owner.id);
		return ownerProject.id;
	}

	/**
	 * The project and its creator. For a personal project, the creator is the
	 * user of the project.
	 */
	private async findTarget(projectId: string) {
		return await this.projectRepository.findOne({
			where: { id: projectId },
			relations: { creator: true },
		});
	}
}

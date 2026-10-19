import type {
	ScimConfigResponse,
	ScimDeprovisioningPolicy,
	ScimTransferTarget,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, type Project, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

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

type DeprovisioningPolicyChange = Partial<ScimDeprovisioningPolicy>;

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
			? toScimTransferTarget(
					transferProjectId,
					await this.transferTargetRepository.findWithCreator(transferProjectId, {}),
				)
			: null;

		return { onDelete, dataAction, transferTarget };
	}

	/**
	 * Saves the fields that the change sets and keeps the other fields.
	 * Throws `ScimInvalidTransferTargetError` before it saves anything when the
	 * new transfer target is not valid.
	 */
	async updatePolicy(change: DeprovisioningPolicyChange): Promise<ScimDeprovisioningPolicy> {
		const current = await this.getPolicy();
		const { onDelete, dataAction, transferProjectId } = change;
		if (onDelete === undefined && dataAction === undefined && transferProjectId === undefined) {
			return current;
		}

		if (transferProjectId) await this.assertValidTransferTarget(transferProjectId);

		const policy: ScimDeprovisioningPolicy = {
			onDelete: onDelete ?? current.onDelete,
			dataAction: dataAction ?? current.dataAction,
			transferProjectId:
				transferProjectId === undefined ? current.transferProjectId : transferProjectId,
		};
		await this.scimSettingsService.setDeprovisioningPolicy(policy);

		return policy;
	}

	/**
	 * Deletes the user. With `dataAction: transfer`, the work goes to the
	 * transfer target first. Otherwise it is deleted with the personal project
	 * of the user.
	 *
	 * The user deletion refuses the instance owner. This maps that refusal, and
	 * a policy that blocks the transfer, to a SCIM 403.
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
			if (error instanceof ForbiddenError || error instanceof PolicyViolationError) {
				throw new ScimForbiddenError(error.message);
			}
			throw error;
		}

		this.logger.info('SCIM: User deleted', {
			userId: user.id,
			dataAction: policy.dataAction,
			transferProjectId,
		});
	}

	private async assertValidTransferTarget(projectId: string) {
		const project = await this.transferTargetRepository.findWithCreator(projectId, {});

		if (!project) {
			throw new ScimInvalidTransferTargetError(`The transfer project ${projectId} does not exist.`);
		}

		if (!isValidScimTransferTarget(project)) {
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
		if (storedId) {
			const problem = await this.findTransferTargetProblem(user, storedId);
			if (!problem) return storedId;

			this.logger.warn(
				`SCIM: The transfer target ${problem}. The work of the deleted user goes to the personal project of the owner.`,
				{ userId: user.id, transferProjectId: storedId },
			);
		}

		const owner = await this.ownershipService.getInstanceOwner();
		const ownerProject = await this.projectRepository.getPersonalProjectForUserOrFail(owner.id);
		return ownerProject.id;
	}

	private async findTransferTargetProblem(user: User, projectId: string): Promise<string | null> {
		const project = await this.transferTargetRepository.findWithCreator(projectId, {});

		if (!project) return 'no longer exists';
		if (project.type === 'personal' && project.creatorId === user.id) {
			return 'is the personal project of the deleted user';
		}
		if (!isValidScimTransferTarget(project)) return 'is the personal project of a deactivated user';

		return null;
	}
}

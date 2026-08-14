import type { RedactionFloor } from '@n8n/api-types';
import {
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { DistributiveOmit } from '@n8n/utils/types';

import { EventService } from '@/events/event.service';
import type { RelayEventMap, UserLike } from '@/events/maps/relay.event-map';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { RoleService } from '@/services/role.service';

/**
 * The writable subset of the security policy shared by the internal controller
 * and the public API. Workflow reviews are handled separately by the caller as
 * they are gated behind a dedicated license + dev flag.
 */
export interface SecurityPolicyUpdate {
	personalSpacePublishing?: boolean;
	personalSpaceSharing?: boolean;
	redactionEnforcement?: { floor: RedactionFloor };
}

/**
 * The core security policy read shared by the internal controller and the
 * public API, without the layer-specific "managed by" representation.
 */
export interface SecurityPolicyReadResult {
	personalSpacePublishing: boolean;
	personalSpaceSharing: boolean;
	publishedPersonalWorkflowsCount: number;
	sharedPersonalWorkflowsCount: number;
	sharedPersonalCredentialsCount: number;
	redactionEnforcement: { floor: RedactionFloor };
}

/**
 * The `instance-policies-updated` payload without the `user` envelope. Kept as a
 * distributed union so each `settingName` stays bound to its own `value` type.
 */
type InstancePolicyUpdate = DistributiveOmit<RelayEventMap['instance-policies-updated'], 'user'>;

@Service()
export class SecuritySettingsService {
	private readonly PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly roleService: RoleService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly instanceRedactionEnforcementService: InstanceRedactionEnforcementService,
		private readonly eventService: EventService,
	) {}

	/**
	 * Read the core security policy (personal-space toggles, usage counts and the
	 * redaction enforcement floor). Callers add their own "managed by"
	 * representation on top.
	 */
	async getSecuritySettings(): Promise<SecurityPolicyReadResult> {
		const [
			settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			floor,
		] = await Promise.all([
			this.arePersonalSpaceSettingsEnabled(),
			this.getPublishedPersonalWorkflowsCount(),
			this.getSharedPersonalWorkflowsCount(),
			this.getSharedPersonalCredentialsCount(),
			this.instanceRedactionEnforcementService.get(),
		]);

		return {
			...settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			redactionEnforcement: { floor },
		};
	}

	/**
	 * Apply a security policy update and emit the corresponding audit events.
	 * Only the provided fields are changed; the returned object echoes the
	 * applied subset. Callers must enforce access/licensing/managed-by rules
	 * before invoking this.
	 */
	async updateSecuritySettings(
		securityPolicyUpdate: SecurityPolicyUpdate,
		actor: UserLike,
	): Promise<SecurityPolicyUpdate> {
		const updatedSettings: SecurityPolicyUpdate = {};

		const { personalSpacePublishing, personalSpaceSharing, redactionEnforcement } =
			securityPolicyUpdate;
		if (personalSpacePublishing !== undefined) {
			await this.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				personalSpacePublishing,
			);
			updatedSettings.personalSpacePublishing = personalSpacePublishing;
			this.emitInstancePolicyUpdated(actor, {
				settingName: 'workflow_publishing',
				value: personalSpacePublishing,
			});
		}

		if (personalSpaceSharing !== undefined) {
			await this.setPersonalSpaceSetting(PERSONAL_SPACE_SHARING_SETTING, personalSpaceSharing);
			updatedSettings.personalSpaceSharing = personalSpaceSharing;
			this.emitInstancePolicyUpdated(actor, {
				settingName: 'workflow_sharing',
				value: personalSpaceSharing,
			});
		}

		if (redactionEnforcement !== undefined) {
			const before = await this.instanceRedactionEnforcementService.get();
			const after = redactionEnforcement.floor;
			updatedSettings.redactionEnforcement = { floor: after };
			if (before !== after) {
				await this.instanceRedactionEnforcementService.set(after);
				const user = this.toEventUser(actor);
				this.eventService.emit('redaction-enforcement-updated', { user, before, after });
				// Report the redaction enforcement floor alongside the other instance
				// policies. `'off' | 'production' | 'all'` captures both adoption
				// (off vs not) and scope (production vs production+manual).
				this.emitInstancePolicyUpdated(actor, {
					settingName: 'data_redaction_enforcement_floor',
					value: after,
				});
			}
		}

		return updatedSettings;
	}

	emitInstancePolicyUpdated(actor: UserLike, update: InstancePolicyUpdate) {
		const user = this.toEventUser(actor);
		this.eventService.emit('instance-policies-updated', {
			user,
			...update,
		});
	}

	async setPersonalSpaceSetting(
		setting: typeof PERSONAL_SPACE_PUBLISHING_SETTING | typeof PERSONAL_SPACE_SHARING_SETTING,
		enabled: boolean,
	): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: setting.key,
				value: enabled.toString(),
				loadOnStartup: true,
			},
			['key'],
		);

		if (enabled) {
			await this.roleService.addScopesToRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
		} else {
			await this.roleService.removeScopesFromRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
		}
	}

	async arePersonalSpaceSettingsEnabled(): Promise<{
		personalSpacePublishing: boolean;
		personalSpaceSharing: boolean;
	}> {
		const settingKeys = [PERSONAL_SPACE_PUBLISHING_SETTING.key, PERSONAL_SPACE_SHARING_SETTING.key];
		const rows = await this.settingsRepository.findByKeys(settingKeys);
		const personalSpacePublishingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_PUBLISHING_SETTING.key,
		)?.value;
		const personalSpaceSharingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_SHARING_SETTING.key,
		)?.value;

		return {
			personalSpacePublishing: personalSpacePublishingValue !== 'false', // Default to true for backward compatibility
			personalSpaceSharing: personalSpaceSharingValue !== 'false', // Default to true for backward compatibility
		};
	}

	async getPublishedPersonalWorkflowsCount(): Promise<number> {
		return await this.workflowRepository.getPublishedPersonalWorkflowsCount();
	}

	async getSharedPersonalWorkflowsCount(): Promise<number> {
		return await this.sharedWorkflowRepository.getSharedPersonalWorkflowsCount();
	}

	async getSharedPersonalCredentialsCount(): Promise<number> {
		return await this.sharedCredentialsRepository.getSharedPersonalCredentialsCount();
	}

	/** Normalize to the minimal audit envelope so a full user entity never leaks extra fields. */
	private toEventUser(actor: UserLike): UserLike {
		return {
			id: actor.id,
			email: actor.email,
			firstName: actor.firstName,
			lastName: actor.lastName,
			role: actor.role,
		};
	}
}

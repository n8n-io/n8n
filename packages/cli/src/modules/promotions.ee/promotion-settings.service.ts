import {
	promotionRequireApprovalSchema,
	type PromotionSettings,
	type UpdatePromotionSettingsDto,
} from '@n8n/api-types';
import { EventService, loginIdOf, RoleService } from '@n8n/backend-services';
import { type OperationContext, SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	getPromotionScopesOfProjectRoles,
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROMOTION_PROJECT_ACCESS_SETTING_KEYS,
	PROMOTION_PROJECT_ACCESS_SETTINGS,
	PROMOTION_PROJECT_SCOPES,
	readPromotionProjectAccess,
} from '@n8n/permissions';

import type { UserLike } from '@/types/user-like.types';

const REQUIRE_APPROVAL_KEY = 'promotions.requireApproval';

const PROMOTION_SETTINGS = [...PROMOTION_PROJECT_ACCESS_SETTINGS, 'requireApproval'] as const;
type PromotionSetting = (typeof PROMOTION_SETTINGS)[number];

const SETTING_KEYS = {
	...PROMOTION_PROJECT_ACCESS_SETTING_KEYS,
	requireApproval: REQUIRE_APPROVAL_KEY,
} as const satisfies Record<keyof PromotionSettings, string>;

const POLICY_SETTING_NAMES = {
	whoCanPromote: 'promotions_who_can_promote',
	whoCanApprove: 'promotions_who_can_approve',
	whoCanApply: 'promotions_who_can_apply',
	requireApproval: 'promotions_require_approval',
} as const satisfies Record<PromotionSetting, string>;

/** A missing or unknown value is the default, so an instance needs no stored row. */
const readRequireApproval = (value: string | undefined) => {
	const parsed = promotionRequireApprovalSchema.safeParse(value);
	return parsed.success ? parsed.data : 'whenConfigured';
};

@Service()
export class PromotionSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly txRunner: TransactionRunner,
		private readonly roleService: RoleService,
		private readonly eventService: EventService,
	) {}

	async get(): Promise<PromotionSettings> {
		const rows = await this.settingsRepository.findByKeys(Object.values(SETTING_KEYS));
		return {
			...readPromotionProjectAccess(rows),
			requireApproval: readRequireApproval(rows.find((r) => r.key === REQUIRE_APPROVAL_KEY)?.value),
		};
	}

	/**
	 * Whether every promote must push a new branch, whatever the environment setting is.
	 * A failed read throws, so a promote never pushes past the review.
	 */
	async isApprovalAlwaysRequired(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(REQUIRE_APPROVAL_KEY);
		return readRequireApproval(row?.value) === 'alwaysRequired';
	}

	async update(
		actor: UserLike,
		settings: UpdatePromotionSettingsDto,
		ctx: OperationContext = {},
	): Promise<PromotionSettings> {
		const before = await this.get();

		await this.txRunner.run(ctx, async (trxCtx) => {
			for (const setting of PROMOTION_SETTINGS) {
				const value = settings[setting];
				// A setting that the request leaves out keeps its value.
				if (value === undefined) continue;
				await this.settingsRepository.upsertByKey(SETTING_KEYS[setting], value, false, trxCtx);
			}
		});

		const after = await this.get();
		// Report the change once it is saved. If the role update below fails, a retry finds
		// nothing changed and would not report it.
		this.emitChanges(actor, settings, before, after, ctx);
		// Only the who-can settings change the roles. A retry with the same values still syncs,
		// so it repairs a sync that failed.
		if (PROMOTION_PROJECT_ACCESS_SETTINGS.some((s) => settings[s] !== undefined)) {
			await this.syncProjectRoleScopes(after);
		}

		return after;
	}

	/**
	 * Recomputes the promotion scopes of the system project roles from all settings.
	 * The startup role sync uses the same function, so it repairs a sync that failed here.
	 */
	private async syncProjectRoleScopes(settings: PromotionSettings) {
		const granted = getPromotionScopesOfProjectRoles(settings);

		for (const slug of [PROJECT_ADMIN_ROLE_SLUG, PROJECT_EDITOR_ROLE_SLUG] as const) {
			const toRemove = PROMOTION_PROJECT_SCOPES.filter((s) => !granted[slug].includes(s));
			// Remove before adding. A scope that stays granted is never removed.
			if (toRemove.length > 0) await this.roleService.removeScopesFromRole(slug, toRemove);
			if (granted[slug].length > 0) await this.roleService.addScopesToRole(slug, granted[slug]);
		}
	}

	private emitChanges(
		actor: UserLike,
		request: UpdatePromotionSettingsDto,
		before: PromotionSettings,
		after: PromotionSettings,
		ctx: OperationContext,
	) {
		// Only the settings of this request, so a concurrent change by another admin is not
		// reported under this actor.
		const changed = PROMOTION_SETTINGS.filter(
			(s) => request[s] !== undefined && before[s] !== after[s],
		);
		if (changed.length === 0) return;

		const { id, email, firstName, lastName, role } = actor;
		const user = { id, email, firstName, lastName, role };
		const loginId = loginIdOf(ctx);

		for (const setting of changed) {
			this.eventService.emit('instance-policies-updated', {
				user,
				settingName: POLICY_SETTING_NAMES[setting],
				value: after[setting],
				loginId,
			});
		}

		this.eventService.emit('promotion-settings-updated', {
			user,
			before: Object.fromEntries(changed.map((s) => [s, before[s]])),
			after: Object.fromEntries(changed.map((s) => [s, after[s]])),
			loginId,
		});
	}
}

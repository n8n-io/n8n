import { z } from 'zod';

import { PROJECT_ADMIN_ROLE_SLUG, PROJECT_EDITOR_ROLE_SLUG } from '../constants.ee';
import type { Scope } from '../types.ee';

export const promotionProjectAccessSchema = z.enum([
	'instanceAdmins',
	'projectAdmins',
	'projectAdminsAndEditors',
]);
export type PromotionProjectAccess = z.infer<typeof promotionProjectAccessSchema>;

export const PROMOTION_PROJECT_ACCESS_SETTINGS = [
	'whoCanPromote',
	'whoCanApprove',
	'whoCanApply',
] as const;
export type PromotionProjectAccessSetting = (typeof PROMOTION_PROJECT_ACCESS_SETTINGS)[number];
export type PromotionProjectAccessSettings = Record<
	PromotionProjectAccessSetting,
	PromotionProjectAccess
>;

/** Keys of the rows in the `settings` table. */
export const PROMOTION_PROJECT_ACCESS_SETTING_KEYS = {
	whoCanPromote: 'promotions.whoCanPromote',
	whoCanApprove: 'promotions.whoCanApprove',
	whoCanApply: 'promotions.whoCanApply',
} as const satisfies Record<PromotionProjectAccessSetting, string>;

type PromotionProjectRole = typeof PROJECT_ADMIN_ROLE_SLUG | typeof PROJECT_EDITOR_ROLE_SLUG;

const SCOPES_OF_SETTING = {
	whoCanPromote: ['promotions:promote', 'promotions:readReviews'],
	whoCanApprove: ['promotions:readReviews', 'promotions:approveReviews'],
	whoCanApply: ['promotions:apply'],
} satisfies Record<PromotionProjectAccessSetting, Scope[]>;

/** Every scope that these settings can give to a system project role. */
export const PROMOTION_PROJECT_SCOPES: readonly Scope[] = [
	...new Set(Object.values(SCOPES_OF_SETTING).flat()),
];

const ROLES_OF_ACCESS = {
	instanceAdmins: [],
	projectAdmins: [PROJECT_ADMIN_ROLE_SLUG],
	projectAdminsAndEditors: [PROJECT_ADMIN_ROLE_SLUG, PROJECT_EDITOR_ROLE_SLUG],
} satisfies Record<PromotionProjectAccess, PromotionProjectRole[]>;

/**
 * Computes the promotion scopes of the system project roles from all three settings together.
 * Promote and Approve both give `readReviews`, so one setting alone cannot decide it.
 */
export function getPromotionScopesOfProjectRoles(
	access: PromotionProjectAccessSettings,
): Record<PromotionProjectRole, Scope[]> {
	const granted = {
		[PROJECT_ADMIN_ROLE_SLUG]: new Set<Scope>(),
		[PROJECT_EDITOR_ROLE_SLUG]: new Set<Scope>(),
	};

	for (const setting of PROMOTION_PROJECT_ACCESS_SETTINGS) {
		for (const role of ROLES_OF_ACCESS[access[setting]]) {
			for (const scope of SCOPES_OF_SETTING[setting]) granted[role].add(scope);
		}
	}

	return {
		[PROJECT_ADMIN_ROLE_SLUG]: [...granted[PROJECT_ADMIN_ROLE_SLUG]],
		[PROJECT_EDITOR_ROLE_SLUG]: [...granted[PROJECT_EDITOR_ROLE_SLUG]],
	};
}

/** Reads the settings from their `settings` rows. A missing or unknown value is the default. */
export function readPromotionProjectAccess(
	rows: ReadonlyArray<{ key: string; value: string }>,
): PromotionProjectAccessSettings {
	const valueOf = (setting: PromotionProjectAccessSetting): PromotionProjectAccess => {
		const row = rows.find((r) => r.key === PROMOTION_PROJECT_ACCESS_SETTING_KEYS[setting]);
		const parsed = promotionProjectAccessSchema.safeParse(row?.value);
		return parsed.success ? parsed.data : 'instanceAdmins';
	};

	return {
		whoCanPromote: valueOf('whoCanPromote'),
		whoCanApprove: valueOf('whoCanApprove'),
		whoCanApply: valueOf('whoCanApply'),
	};
}

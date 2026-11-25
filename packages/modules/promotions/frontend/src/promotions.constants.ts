import type { PromotionProjectAccessSetting } from '@n8n/permissions';

export const PROMOTIONS_SETTINGS_VIEW = 'PromotionsSettings';
export const PROMOTIONS_ENVIRONMENT_ADD_VIEW = 'PromotionsEnvironmentAdd';
export const PROMOTIONS_ENVIRONMENT_EDIT_VIEW = 'PromotionsEnvironmentEdit';

export const ENVIRONMENTS_DOCS_URL = 'https://docs.n8n.io/administer/environments';
export const ENVIRONMENTS_PLAN_DOCS_URL = `${ENVIRONMENTS_DOCS_URL}/plan-your-environments`;
export const ENVIRONMENTS_UPGRADE_DOCS_URL = `${ENVIRONMENTS_DOCS_URL}/upgrade-from-environments-classic`;

/** The scopes that open the promotion settings page. Each change also needs its manage scope. */
export const PROMOTIONS_SETTINGS_SCOPES = [
	'promotions:readProviders',
	'promotions:readEnvironments',
] as const;

/**
 * The project access settings that the Environments settings page shows. A setting shows
 * only when the capability it unlocks ships: LIGO-1474 adds `whoCanPromote`, LIGO-1476 adds
 * `whoCanApply`.
 */
export const PROJECT_ACCESS_SETTINGS_ON_ENVIRONMENTS_PAGE: readonly PromotionProjectAccessSetting[] =
	[];

export const PROMOTION_PREVIEW_VIEWS = {
	promote: 'PromotionPreviewPromote',
	apply: 'PromotionPreviewApply',
} as const;

/** The preview page of a whole-instance Apply. */
export const PROMOTION_INSTANCE_APPLY_VIEW = 'PromotionInstanceApply';

/** The details endpoint accepts at most this many keys in one request. */
export const PROMOTION_DETAILS_BATCH_SIZE = 50;

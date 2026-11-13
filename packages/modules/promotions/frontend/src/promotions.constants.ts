export const PROMOTIONS_SETTINGS_VIEW = 'PromotionsSettings';
export const PROMOTIONS_ENVIRONMENT_ADD_VIEW = 'PromotionsEnvironmentAdd';
export const PROMOTIONS_ENVIRONMENT_EDIT_VIEW = 'PromotionsEnvironmentEdit';

export const ENVIRONMENTS_DOCS_URL = 'https://docs.n8n.io/administer/environments';
export const ENVIRONMENTS_PLAN_DOCS_URL = `${ENVIRONMENTS_DOCS_URL}/plan-your-environments`;
export const ENVIRONMENTS_UPGRADE_DOCS_URL = `${ENVIRONMENTS_DOCS_URL}/upgrade-from-environments-classic`;

/** The scopes that the promotion settings page needs. */
export const PROMOTIONS_SETTINGS_SCOPES = [
	'promotions:list',
	'promotions:read',
	'promotions:create',
	'promotions:update',
	'promotions:delete',
] as const;

export const PROMOTION_PREVIEW_VIEWS = {
	promote: 'PromotionPreviewPromote',
	apply: 'PromotionPreviewApply',
} as const;

/** The preview page of a whole-instance Apply. */
export const PROMOTION_INSTANCE_APPLY_VIEW = 'PromotionInstanceApply';

/** The details endpoint accepts at most this many keys in one request. */
export const PROMOTION_DETAILS_BATCH_SIZE = 50;

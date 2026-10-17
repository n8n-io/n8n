export const PROMOTION_SELECT_MODAL_KEY = 'promotionSelect';

export const PROMOTIONS_SETTINGS_VIEW = 'PromotionsSettings';

/** The scopes that the promotion settings page needs. */
export const PROMOTIONS_SETTINGS_SCOPES = [
	'gitConnection:list',
	'gitConnection:read',
	'gitConnection:create',
	'gitConnection:update',
	'gitConnection:delete',
] as const;

export const PROMOTION_PREVIEW_VIEWS = {
	promote: 'PromotionPreviewPromote',
	apply: 'PromotionPreviewApply',
} as const;

/** The details endpoint accepts at most this many keys in one request. */
export const PROMOTION_DETAILS_BATCH_SIZE = 50;

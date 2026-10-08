import type { PromotionGitHostType, PromotionProviderType } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

export const PROMOTION_SELECT_MODAL_KEY = 'promotionSelect';

export const PROMOTION_PROVIDER_TYPE_LABELS = {
	git: 'settings.promotions.providers.type.git',
	gitlab: 'settings.promotions.providers.type.gitlab',
} as const satisfies Record<PromotionProviderType, BaseTextKey>;

/** Host-specific setup copy. The forms do not need provider-specific branches. */
export const PROMOTION_GIT_HOST_FORM_TEXT = {
	gitlab: {
		baseUrlLabel: 'settings.promotions.provider.form.baseUrl',
		baseUrlHint: 'settings.promotions.provider.form.baseUrl.hint',
		accessTokenLabel: 'settings.promotions.provider.form.accessToken',
		accessTokenHint: 'settings.promotions.provider.form.accessToken.hint',
		accessTokenRequired: 'settings.promotions.provider.form.accessToken.required',
	},
} as const satisfies Record<
	PromotionGitHostType,
	{
		baseUrlLabel: BaseTextKey;
		baseUrlHint: BaseTextKey;
		accessTokenLabel: BaseTextKey;
		accessTokenHint: BaseTextKey;
		accessTokenRequired: BaseTextKey;
	}
>;

export const PROMOTIONS_SETTINGS_VIEW = 'PromotionsSettings';

import type { WhatsAppMetaState } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

const WHATSAPP_MANAGER_URL = 'https://business.facebook.com/wa/manage/phone-numbers/';
const META_BUSINESS_VERIFICATION_URL = 'https://business.facebook.com/settings/security';

export interface WhatsAppMetaPresentation {
	theme: 'warning' | 'danger';
	/** The one-line headline. Takes `{number}` and `{name}`. */
	titleKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	action?: { labelKey: BaseTextKey; url: string };
}

const submitNewName: WhatsAppMetaPresentation['action'] = {
	labelKey: 'agents.channels.whatsapp.meta.action.submitNewName',
	url: WHATSAPP_MANAGER_URL,
};

const presentations: Record<
	Exclude<WhatsAppMetaState, 'connected' | 'unknown'>,
	WhatsAppMetaPresentation
> = {
	numberPending: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.numberPending.title',
		descriptionKey: 'agents.channels.whatsapp.meta.numberPending.description',
	},
	dailyLimit: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.dailyLimit.title',
		descriptionKey: 'agents.channels.whatsapp.meta.dailyLimit.description',
	},
	nameInReviewBlocked: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameInReview.title',
		descriptionKey: 'agents.channels.whatsapp.meta.nameInReviewBlocked.description',
	},
	nameDeclinedBlocked: {
		theme: 'danger',
		titleKey: 'agents.channels.whatsapp.meta.nameDeclined.title',
		descriptionKey: 'agents.channels.whatsapp.meta.nameDeclinedBlocked.description',
		action: submitNewName,
	},
	nameDeclined: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameDeclined.title',
		descriptionKey: 'agents.channels.whatsapp.meta.nameDeclined.description',
		action: submitNewName,
	},
	nameInReview: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameInReview.title',
		descriptionKey: 'agents.channels.whatsapp.meta.nameInReview.description',
	},
	businessNotVerified: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.businessNotVerified.title',
		descriptionKey: 'agents.channels.whatsapp.meta.businessNotVerified.description',
		action: {
			labelKey: 'agents.channels.whatsapp.meta.action.verifyBusiness',
			url: META_BUSINESS_VERIFICATION_URL,
		},
	},
	businessInReview: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.businessInReview.title',
		descriptionKey: 'agents.channels.whatsapp.meta.businessInReview.description',
	},
};

/** What to show for a state, or `null` when there is nothing to report. */
export function presentWhatsAppMetaState(
	state: WhatsAppMetaState,
): WhatsAppMetaPresentation | null {
	return state === 'connected' || state === 'unknown' ? null : presentations[state];
}

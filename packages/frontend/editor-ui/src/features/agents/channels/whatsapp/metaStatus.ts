import type { WhatsAppMetaState } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/** The profile and display name are edited here. The identity card links to it too. */
export const WHATSAPP_MANAGER_URL =
	'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/';
const META_BUSINESS_VERIFICATION_URL = 'https://business.facebook.com/settings/security';

export interface WhatsAppMetaPresentation {
	theme: 'warning' | 'danger';
	/** The one-line headline. Takes `{number}` and `{name}`. */
	titleKey: BaseTextKey;
	/** The headline to use when Meta does not give the number or name that `titleKey` needs. */
	fallbackTitle?: { needs: 'number' | 'name'; key: BaseTextKey };
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
	numberUnavailable: {
		theme: 'danger',
		titleKey: 'agents.channels.whatsapp.meta.numberUnavailable.title',
		fallbackTitle: {
			needs: 'number',
			key: 'agents.channels.whatsapp.meta.numberUnavailable.titleNoNumber',
		},
		descriptionKey: 'agents.channels.whatsapp.meta.numberUnavailable.description',
		action: {
			labelKey: 'agents.channels.whatsapp.meta.action.openManager',
			url: WHATSAPP_MANAGER_URL,
		},
	},
	numberPending: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.numberPending.title',
		fallbackTitle: {
			needs: 'number',
			key: 'agents.channels.whatsapp.meta.numberPending.titleNoNumber',
		},
		descriptionKey: 'agents.channels.whatsapp.meta.numberPending.description',
	},
	dailyLimit: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.dailyLimit.title',
		fallbackTitle: {
			needs: 'number',
			key: 'agents.channels.whatsapp.meta.dailyLimit.titleNoNumber',
		},
		descriptionKey: 'agents.channels.whatsapp.meta.dailyLimit.description',
	},
	nameInReviewBlocked: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameInReview.title',
		fallbackTitle: { needs: 'name', key: 'agents.channels.whatsapp.meta.nameInReview.titleNoName' },
		descriptionKey: 'agents.channels.whatsapp.meta.nameInReviewBlocked.description',
	},
	nameDeclinedBlocked: {
		theme: 'danger',
		titleKey: 'agents.channels.whatsapp.meta.nameDeclined.title',
		fallbackTitle: { needs: 'name', key: 'agents.channels.whatsapp.meta.nameDeclined.titleNoName' },
		descriptionKey: 'agents.channels.whatsapp.meta.nameDeclinedBlocked.description',
		action: submitNewName,
	},
	nameDeclined: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameDeclined.title',
		fallbackTitle: { needs: 'name', key: 'agents.channels.whatsapp.meta.nameDeclined.titleNoName' },
		descriptionKey: 'agents.channels.whatsapp.meta.nameDeclined.description',
		action: submitNewName,
	},
	nameInReview: {
		theme: 'warning',
		titleKey: 'agents.channels.whatsapp.meta.nameInReview.title',
		fallbackTitle: { needs: 'name', key: 'agents.channels.whatsapp.meta.nameInReview.titleNoName' },
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

/**
 * The headline key for a status. It drops the number or name from the headline
 * when Meta did not give it, so the headline never has an empty gap.
 */
export function metaTitleKey(
	presentation: WhatsAppMetaPresentation,
	status: { displayName?: string; displayPhoneNumber?: string },
): BaseTextKey {
	const { fallbackTitle } = presentation;
	if (!fallbackTitle) return presentation.titleKey;
	const value = fallbackTitle.needs === 'number' ? status.displayPhoneNumber : status.displayName;
	return value ? presentation.titleKey : fallbackTitle.key;
}

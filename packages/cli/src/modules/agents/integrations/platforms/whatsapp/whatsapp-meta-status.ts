import type { WhatsAppMetaState } from '@n8n/api-types';

/** The tier Meta gives a business that is not verified. */
const UNVERIFIED_MESSAGING_TIER = 'TIER_250';

export interface WhatsAppMetaSignals {
	/** `status` on the phone number, e.g. `CONNECTED`, `PENDING`, `RESTRICTED`. */
	numberStatus?: string;
	/** `name_status` on the phone number: the name in use. */
	nameStatus?: string;
	/** `new_name_status` on the phone number: a name change that is not final yet. */
	newNameStatus?: string;
	messagingLimitTier?: string;
	/** `business_verification_status` on the business account. */
	businessVerificationStatus?: string;
}

/** Meta has the request and is working on it. */
const IN_REVIEW_VERIFICATION = new Set(['pending']);

/**
 * Verification is not under way, ended without the business verified, or
 * waits for the business to send more information. The user can act on each,
 * so these show the "Verify your business" link.
 */
const NOT_VERIFIED_VERIFICATION = new Set([
	'not_verified',
	'pending_submission',
	'pending_need_more_info',
	'rejected',
	'failed',
	'revoked',
	'expired',
]);

/**
 * Number statuses that mean the number cannot send. Meta does not publish the
 * values of the phone number `status` field. This list follows the Graph API
 * enum that client libraries such as RestFB carry. Other values, such as
 * `FLAGGED` and `RATE_LIMITED`, show nothing until their meaning is known.
 */
const UNAVAILABLE_NUMBER_STATUSES = new Set(['BANNED', 'DISCONNECTED', 'DELETED', 'MIGRATED']);

const isPending = (status?: string) => status === 'PENDING_REVIEW';
const isDeclined = (status?: string) => status === 'DECLINED';

/**
 * Picks the one state to show, most severe first. A number with no approved
 * name yet cannot send. A number that changes an approved name keeps sending
 * with the old one, so those two cases differ in `name_status` against
 * `new_name_status`.
 */
export function resolveWhatsAppMetaState(signals: WhatsAppMetaSignals): WhatsAppMetaState {
	const { numberStatus, nameStatus, newNameStatus } = signals;

	if (numberStatus && UNAVAILABLE_NUMBER_STATUSES.has(numberStatus)) return 'numberUnavailable';
	if (numberStatus === 'PENDING') return 'numberPending';
	if (isDeclined(nameStatus)) return 'nameDeclinedBlocked';
	if (isPending(nameStatus)) return 'nameInReviewBlocked';
	if (numberStatus === 'RESTRICTED') return 'dailyLimit';
	if (isDeclined(newNameStatus)) return 'nameDeclined';
	if (isPending(newNameStatus)) return 'nameInReview';

	// Verification only matters while the business sits on the lowest tier.
	// A higher tier means no cap is left to lift.
	// `ineligible` shows nothing on purpose. Meta does not say what it means,
	// and a "verify your business" link could lead nowhere.
	if (signals.messagingLimitTier === UNVERIFIED_MESSAGING_TIER) {
		const verification = signals.businessVerificationStatus;
		if (verification && IN_REVIEW_VERIFICATION.has(verification)) return 'businessInReview';
		if (verification && NOT_VERIFIED_VERIFICATION.has(verification)) return 'businessNotVerified';
	}

	return 'connected';
}

/**
 * How the WhatsApp number appears to customers, as set in Meta. Every field is
 * optional: a business can leave its profile empty, and the setup still works.
 */
export interface WhatsAppBusinessProfile {
	/** The display name Meta approved for the number. */
	verifiedName?: string;
	/** The number as WhatsApp shows it, e.g. `+1 555-010-0199`. */
	displayPhoneNumber?: string;
	description?: string;
	/** A short-lived Meta CDN URL. Do not store it. */
	profilePictureUrl?: string;
}

/**
 * Result of checking a WhatsApp credential against Meta before the channel is
 * connected. A wrong ID or secret otherwise surfaces only when the first
 * message fails.
 *
 * - `incomplete`: a required field is empty.
 * - `temporaryToken`: the access token expires soon, like the one on API Setup.
 * - `mismatch`: Meta refuses the token, the IDs, or the app secret.
 * - `unreachable`: n8n could not reach Meta.
 */
export type WhatsAppCredentialCheck =
	| { status: 'ok'; profile: WhatsAppBusinessProfile }
	| {
			status: 'failed';
			reason: 'incomplete' | 'temporaryToken' | 'mismatch' | 'unreachable';
	  };

/** Whether Meta has completed the webhook handshake with this agent. */
export interface WhatsAppWebhookStatus {
	verified: boolean;
}

/**
 * Whether Meta lets the number send messages, from its `health_status`.
 *
 * - `available`: the number can send.
 * - `limited`: the number can send, with a lower limit. A display name that is
 *   still in review gives this.
 * - `blocked`: the number cannot send. `reasons` says why.
 * - `unknown`: Meta did not say, or n8n could not ask.
 */
export type WhatsAppSendingStatus = 'available' | 'limited' | 'blocked' | 'unknown';

/** Where one of Meta's reviews is. `notStarted` means nobody submitted it yet. */
export type WhatsAppReviewStatus = 'approved' | 'pending' | 'rejected' | 'notStarted' | 'unknown';

/** One reason Meta gives for a limited or blocked number, in Meta's words. */
export interface WhatsAppStatusReason {
	description: string;
	/** What Meta suggests to fix it. */
	solution?: string;
}

/** The state of the number and its business account in Meta. */
export interface WhatsAppAccountStatus {
	sending: WhatsAppSendingStatus;
	reasons: WhatsAppStatusReason[];
	/** Meta's review of the display name. */
	displayName: WhatsAppReviewStatus;
	/** Meta's verification of the business that owns the account. */
	businessVerification: WhatsAppReviewStatus;
	/** Meta's review of the WhatsApp Business Account. */
	accountReview: WhatsAppReviewStatus;
	/** A test number, which can only message the recipients set in the Meta app. */
	sandbox: boolean;
}

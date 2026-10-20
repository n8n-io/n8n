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

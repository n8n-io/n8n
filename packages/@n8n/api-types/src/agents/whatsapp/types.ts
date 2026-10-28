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
 * Where Meta's own review of the number, display name or business stands.
 * Meta can take days to finish these, so the settings show the state and keep
 * it current.
 *
 * - `connected`: nothing to report.
 * - `numberUnavailable`: Meta shows the number as disconnected, banned, deleted or moved. The agent cannot send or receive.
 * - `numberPending`: Meta has not activated the number. The agent cannot send or receive.
 * - `dailyLimit`: the number reached its daily limit. The agent can reply, but cannot start conversations.
 * - `nameInReviewBlocked`, `nameDeclinedBlocked`: a first display name is not approved. The agent cannot send.
 * - `nameInReview`, `nameDeclined`: a changed display name is not approved. The agent still works on the old name.
 * - `businessNotVerified`, `businessInReview`: the agent works, but scheduled messages stay at the 250-people-a-day tier.
 * - `unknown`: n8n could not read the state from Meta. Show nothing.
 */
export type WhatsAppMetaState =
	| 'connected'
	| 'numberUnavailable'
	| 'numberPending'
	| 'dailyLimit'
	| 'nameInReviewBlocked'
	| 'nameDeclinedBlocked'
	| 'nameInReview'
	| 'nameDeclined'
	| 'businessNotVerified'
	| 'businessInReview'
	| 'unknown';

export interface WhatsAppMetaStatus {
	state: WhatsAppMetaState;
	/** The display name that the state is about, as Meta shows it. */
	displayName?: string;
	displayPhoneNumber?: string;
}

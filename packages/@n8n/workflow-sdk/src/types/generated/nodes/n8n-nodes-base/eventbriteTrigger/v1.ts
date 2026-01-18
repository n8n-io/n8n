/**
 * Eventbrite Trigger Node - Version 1
 * Handle Eventbrite events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EventbriteTriggerV1Params {
	authentication?: 'privateKey' | 'oAuth2' | Expression<string>;
/**
 * The Eventbrite Organization to work on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		organization: string | Expression<string>;
/**
 * Limit the triggers to this event. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		event: string | Expression<string>;
/**
 * One or more action to subscribe to
 * @default []
 */
		actions: Array<'attendee.checked_in' | 'attendee.checked_out' | 'attendee.updated' | 'event.created' | 'event.published' | 'event.unpublished' | 'event.updated' | 'order.placed' | 'order.refunded' | 'order.updated' | 'organizer.updated' | 'ticket_class.created' | 'ticket_class.deleted' | 'ticket_class.updated' | 'venue.updated'>;
/**
 * By default does the webhook-data only contain the URL to receive the object data manually. If this option gets activated, it will resolve the data automatically.
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EventbriteTriggerV1Credentials {
	eventbriteApi: CredentialReference;
	eventbriteOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type EventbriteTriggerV1Node = {
	type: 'n8n-nodes-base.eventbriteTrigger';
	version: 1;
	config: NodeConfig<EventbriteTriggerV1Params>;
	credentials?: EventbriteTriggerV1Credentials;
	isTrigger: true;
};
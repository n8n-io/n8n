/**
 * Customer.io Trigger Node Types
 *
 * Starts the workflow on a Customer.io update (Beta)
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/customeriotrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CustomerIoTriggerV1Params {
	/**
	 * The events that can trigger the webhook and whether they are enabled
	 * @default []
	 */
	events: Array<
		| 'customer.subscribed'
		| 'customer.unsubscribed'
		| 'email.attempted'
		| 'email.bounced'
		| 'email.clicked'
		| 'email.converted'
		| 'email.delivered'
		| 'email.drafted'
		| 'email.failed'
		| 'email.opened'
		| 'email.sent'
		| 'email.spammed'
		| 'push.attempted'
		| 'push.bounced'
		| 'push.clicked'
		| 'push.delivered'
		| 'push.drafted'
		| 'push.failed'
		| 'push.opened'
		| 'push.sent'
		| 'slack.attempted'
		| 'slack.clicked'
		| 'slack.drafted'
		| 'slack.failed'
		| 'slack.sent'
		| 'sms.attempted'
		| 'sms.bounced'
		| 'sms.clicked'
		| 'sms.delivered'
		| 'sms.drafted'
		| 'sms.failed'
		| 'sms.sent'
	>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface CustomerIoTriggerV1Credentials {
	customerIoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type CustomerIoTriggerV1Node = {
	type: 'n8n-nodes-base.customerIoTrigger';
	version: 1;
	config: NodeConfig<CustomerIoTriggerV1Params>;
	credentials?: CustomerIoTriggerV1Credentials;
	isTrigger: true;
};

export type CustomerIoTriggerNode = CustomerIoTriggerV1Node;

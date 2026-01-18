/**
 * HubSpot Trigger Node - Version 1
 * Starts the workflow when HubSpot events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HubspotTriggerV1Params {
	eventsUi?: {
		eventValues?: Array<{
			/** Name
			 * @default contact.creation
			 */
			name?: 'company.creation' | 'company.deletion' | 'company.propertyChange' | 'contact.creation' | 'contact.deletion' | 'contact.privacyDeletion' | 'contact.propertyChange' | 'conversation.creation' | 'conversation.deletion' | 'conversation.newMessage' | 'conversation.privacyDeletion' | 'conversation.propertyChange' | 'deal.creation' | 'deal.deletion' | 'deal.propertyChange' | 'ticket.creation' | 'ticket.deletion' | 'ticket.propertyChange' | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { name: ["contact.propertyChange"] }
			 */
			property?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { name: ["company.propertyChange"] }
			 */
			property?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { name: ["deal.propertyChange"] }
			 */
			property?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotTriggerV1Credentials {
	hubspotDeveloperApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HubspotTriggerV1Node = {
	type: 'n8n-nodes-base.hubspotTrigger';
	version: 1;
	config: NodeConfig<HubspotTriggerV1Params>;
	credentials?: HubspotTriggerV1Credentials;
	isTrigger: true;
};
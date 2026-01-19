/**
 * HubSpot Trigger Node - Version 1
 * Starts the workflow when HubSpot events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HubspotTriggerV1Config {
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
// Node Types
// ===========================================================================

interface HubspotTriggerV1NodeBase {
	type: 'n8n-nodes-base.hubspotTrigger';
	version: 1;
	credentials?: HubspotTriggerV1Credentials;
	isTrigger: true;
}

export type HubspotTriggerV1Node = HubspotTriggerV1NodeBase & {
	config: NodeConfig<HubspotTriggerV1Config>;
};

export type HubspotTriggerV1Node = HubspotTriggerV1Node;
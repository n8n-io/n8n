/**
 * Dropcontact Node - Version 1
 * Find B2B emails and enrich contacts
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DropcontactV1Config {
	resource: 'contact' | Expression<string>;
	operation: 'enrich' | 'fetchRequest' | Expression<string>;
	requestId: string | Expression<string>;
	email?: string | Expression<string>;
/**
 * When off, waits for the contact data before completing. Waiting time can be adjusted with Extend Wait Time option. When on, returns a request_id that can be used later in the Fetch Request operation.
 * @displayOptions.show { resource: ["contact"], operation: ["enrich"] }
 * @default false
 */
		simplify?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface DropcontactV1Credentials {
	dropcontactApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DropcontactV1NodeBase {
	type: 'n8n-nodes-base.dropcontact';
	version: 1;
	credentials?: DropcontactV1Credentials;
}

export type DropcontactV1Node = DropcontactV1NodeBase & {
	config: NodeConfig<DropcontactV1Config>;
};

export type DropcontactV1Node = DropcontactV1Node;
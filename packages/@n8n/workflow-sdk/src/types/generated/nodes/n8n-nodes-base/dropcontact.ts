/**
 * Dropcontact Node Types
 *
 * Find B2B emails and enrich contacts
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/dropcontact/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DropcontactV1Params {
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

export type DropcontactV1Node = {
	type: 'n8n-nodes-base.dropcontact';
	version: 1;
	config: NodeConfig<DropcontactV1Params>;
	credentials?: DropcontactV1Credentials;
};

export type DropcontactNode = DropcontactV1Node;

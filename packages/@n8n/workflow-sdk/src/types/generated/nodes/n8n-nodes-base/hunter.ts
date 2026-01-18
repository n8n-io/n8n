/**
 * Hunter Node Types
 *
 * Consume Hunter API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/hunter/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HunterV1Params {
	/**
	 * Operation to consume
	 * @default domainSearch
	 */
	operation?: 'domainSearch' | 'emailFinder' | 'emailVerifier' | Expression<string>;
	/**
	 * Domain name from which you want to find the email addresses. For example, "stripe.com".
	 * @displayOptions.show { operation: ["domainSearch"] }
	 */
	domain: string | Expression<string>;
	/**
	 * Whether to return only the found emails
	 * @displayOptions.show { operation: ["domainSearch"] }
	 * @default true
	 */
	onlyEmails?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["domainSearch"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["domainSearch"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	/**
	 * The person's first name. It doesn't need to be in lowercase.
	 * @displayOptions.show { operation: ["emailFinder"] }
	 */
	firstname: string | Expression<string>;
	/**
	 * The person's last name. It doesn't need to be in lowercase.
	 * @displayOptions.show { operation: ["emailFinder"] }
	 */
	lastname: string | Expression<string>;
	/**
	 * The email address you want to verify
	 * @displayOptions.show { operation: ["emailVerifier"] }
	 */
	email: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface HunterV1Credentials {
	hunterApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HunterV1Node = {
	type: 'n8n-nodes-base.hunter';
	version: 1;
	config: NodeConfig<HunterV1Params>;
	credentials?: HunterV1Credentials;
};

export type HunterNode = HunterV1Node;

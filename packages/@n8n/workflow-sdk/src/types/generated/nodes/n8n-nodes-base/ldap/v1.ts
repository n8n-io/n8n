/**
 * Ldap Node - Version 1
 * Interact with LDAP servers
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LdapV1Params {
	operation?: 'compare' | 'create' | 'delete' | 'rename' | 'search' | 'update' | Expression<string>;
	nodeDebug?: boolean | Expression<boolean>;
/**
 * The distinguished name of the entry to compare
 * @displayOptions.show { operation: ["compare"] }
 */
		dn: string | Expression<string>;
/**
 * The ID of the attribute to compare
 * @displayOptions.show { operation: ["compare"] }
 * @default []
 */
		id: string | Expression<string>;
/**
 * The value to compare
 * @displayOptions.show { operation: ["compare"] }
 */
		value?: string | Expression<string>;
/**
 * The new distinguished name for the entry
 * @displayOptions.show { operation: ["rename"] }
 */
		targetDn: string | Expression<string>;
/**
 * Attributes to add to the entry
 * @displayOptions.show { operation: ["create"] }
 * @default {}
 */
		attributes?: {
		attribute?: Array<{
			/** The ID of the attribute to add
			 */
			id?: string | Expression<string>;
			/** Value of the attribute to set
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * The distinguished name of the subtree to search in
 * @displayOptions.show { operation: ["search"] }
 */
		baseDN: string | Expression<string>;
/**
 * Directory object class to search for
 * @displayOptions.show { operation: ["search"] }
 * @default []
 */
		searchFor?: string | Expression<string>;
/**
 * Custom LDAP filter. Escape these chars * ( ) \ with a backslash "\".
 * @displayOptions.show { operation: ["search"], searchFor: ["custom"] }
 * @default (objectclass=*)
 */
		customFilter?: string | Expression<string>;
/**
 * Attribute to search for
 * @displayOptions.show { operation: ["search"] }
 * @displayOptions.hide { searchFor: ["custom"] }
 * @default []
 */
		attribute: string | Expression<string>;
/**
 * Text to search for, Use * for a wildcard
 * @displayOptions.show { operation: ["search"] }
 * @displayOptions.hide { searchFor: ["custom"] }
 */
		searchText: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LdapV1Credentials {
	ldap: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LdapV1Node = {
	type: 'n8n-nodes-base.ldap';
	version: 1;
	config: NodeConfig<LdapV1Params>;
	credentials?: LdapV1Credentials;
};
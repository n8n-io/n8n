/**
 * Ldap Node Types
 *
 * Interact with LDAP servers
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ldap/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LdapV1Params {
	operation?: 'compare' | 'create' | 'delete' | 'rename' | 'search' | 'update' | Expression<string>;
	nodeDebug?: boolean | Expression<boolean>;
	/**
	 * The distinguished name of the entry to compare
	 */
	dn: string | Expression<string>;
	/**
	 * The ID of the attribute to compare
	 * @default []
	 */
	id: string | Expression<string>;
	/**
	 * The value to compare
	 */
	value?: string | Expression<string>;
	/**
	 * The new distinguished name for the entry
	 */
	targetDn: string | Expression<string>;
	/**
	 * Attributes to add to the entry
	 * @default {}
	 */
	attributes?: Record<string, unknown>;
	/**
	 * The distinguished name of the subtree to search in
	 */
	baseDN: string | Expression<string>;
	/**
	 * Directory object class to search for
	 * @default []
	 */
	searchFor?: string | Expression<string>;
	/**
	 * Custom LDAP filter. Escape these chars * ( ) \ with a backslash "\".
	 * @default (objectclass=*)
	 */
	customFilter?: string | Expression<string>;
	/**
	 * Attribute to search for
	 * @default []
	 */
	attribute: string | Expression<string>;
	/**
	 * Text to search for, Use * for a wildcard
	 */
	searchText: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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

export type LdapNode = {
	type: 'n8n-nodes-base.ldap';
	version: 1;
	config: NodeConfig<LdapV1Params>;
	credentials?: LdapV1Credentials;
};

/**
 * Netlify Node - Version 1
 * Consume Netlify API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Cancel a deployment */
export type NetlifyV1DeployCancelConfig = {
	resource: 'deploy';
	operation: 'cancel';
	deployId: string | Expression<string>;
};

/** Create a new deployment */
export type NetlifyV1DeployCreateConfig = {
	resource: 'deploy';
	operation: 'create';
/**
 * Enter the Site ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["deploy"], operation: ["get", "create", "getAll"] }
 */
		siteId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a deployment */
export type NetlifyV1DeployGetConfig = {
	resource: 'deploy';
	operation: 'get';
/**
 * Enter the Site ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["deploy"], operation: ["get", "create", "getAll"] }
 */
		siteId: string | Expression<string>;
	deployId: string | Expression<string>;
};

/** Get many deployments */
export type NetlifyV1DeployGetAllConfig = {
	resource: 'deploy';
	operation: 'getAll';
/**
 * Enter the Site ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["deploy"], operation: ["get", "create", "getAll"] }
 */
		siteId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["deploy"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["deploy"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Delete a site */
export type NetlifyV1SiteDeleteConfig = {
	resource: 'site';
	operation: 'delete';
	siteId: string | Expression<string>;
};

/** Get a deployment */
export type NetlifyV1SiteGetConfig = {
	resource: 'site';
	operation: 'get';
	siteId: string | Expression<string>;
};

/** Get many deployments */
export type NetlifyV1SiteGetAllConfig = {
	resource: 'site';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["site"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["site"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type NetlifyV1Params =
	| NetlifyV1DeployCancelConfig
	| NetlifyV1DeployCreateConfig
	| NetlifyV1DeployGetConfig
	| NetlifyV1DeployGetAllConfig
	| NetlifyV1SiteDeleteConfig
	| NetlifyV1SiteGetConfig
	| NetlifyV1SiteGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NetlifyV1Credentials {
	netlifyApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type NetlifyV1Node = {
	type: 'n8n-nodes-base.netlify';
	version: 1;
	config: NodeConfig<NetlifyV1Params>;
	credentials?: NetlifyV1Credentials;
};
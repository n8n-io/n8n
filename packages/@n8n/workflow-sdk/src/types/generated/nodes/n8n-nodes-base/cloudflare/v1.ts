/**
 * Cloudflare Node - Version 1
 * Consume Cloudflare API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a certificate */
export type CloudflareV1ZoneCertificateDeleteConfig = {
	resource: 'zoneCertificate';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["upload", "getMany", "get", "delete"] }
 */
		zoneId: string | Expression<string>;
	certificateId: string | Expression<string>;
};

/** Get a certificate */
export type CloudflareV1ZoneCertificateGetConfig = {
	resource: 'zoneCertificate';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["upload", "getMany", "get", "delete"] }
 */
		zoneId: string | Expression<string>;
	certificateId: string | Expression<string>;
};

/** Get many certificates */
export type CloudflareV1ZoneCertificateGetManyConfig = {
	resource: 'zoneCertificate';
	operation: 'getMany';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["upload", "getMany", "get", "delete"] }
 */
		zoneId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["getMany"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["getMany"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Upload a certificate */
export type CloudflareV1ZoneCertificateUploadConfig = {
	resource: 'zoneCertificate';
	operation: 'upload';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["upload", "getMany", "get", "delete"] }
 */
		zoneId: string | Expression<string>;
/**
 * The zone's leaf certificate
 * @displayOptions.show { resource: ["zoneCertificate"], operation: ["upload"] }
 */
		certificate: string | Expression<string>;
	privateKey: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface CloudflareV1Credentials {
	cloudflareApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CloudflareV1NodeBase {
	type: 'n8n-nodes-base.cloudflare';
	version: 1;
	credentials?: CloudflareV1Credentials;
}

export type CloudflareV1ZoneCertificateDeleteNode = CloudflareV1NodeBase & {
	config: NodeConfig<CloudflareV1ZoneCertificateDeleteConfig>;
};

export type CloudflareV1ZoneCertificateGetNode = CloudflareV1NodeBase & {
	config: NodeConfig<CloudflareV1ZoneCertificateGetConfig>;
};

export type CloudflareV1ZoneCertificateGetManyNode = CloudflareV1NodeBase & {
	config: NodeConfig<CloudflareV1ZoneCertificateGetManyConfig>;
};

export type CloudflareV1ZoneCertificateUploadNode = CloudflareV1NodeBase & {
	config: NodeConfig<CloudflareV1ZoneCertificateUploadConfig>;
};

export type CloudflareV1Node =
	| CloudflareV1ZoneCertificateDeleteNode
	| CloudflareV1ZoneCertificateGetNode
	| CloudflareV1ZoneCertificateGetManyNode
	| CloudflareV1ZoneCertificateUploadNode
	;
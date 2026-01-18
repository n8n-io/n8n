/**
 * Cloudflare Node Types
 *
 * Consume Cloudflare API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/cloudflare/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a certificate */
export type CloudflareV1ZoneCertificateDeleteConfig = {
	resource: 'zoneCertificate';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	zoneId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	zoneId: string | Expression<string>;
	/**
	 * The zone's leaf certificate
	 */
	certificate: string | Expression<string>;
	privateKey: string | Expression<string>;
};

export type CloudflareV1Params =
	| CloudflareV1ZoneCertificateDeleteConfig
	| CloudflareV1ZoneCertificateGetConfig
	| CloudflareV1ZoneCertificateGetManyConfig
	| CloudflareV1ZoneCertificateUploadConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CloudflareV1Credentials {
	cloudflareApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CloudflareNode = {
	type: 'n8n-nodes-base.cloudflare';
	version: 1;
	config: NodeConfig<CloudflareV1Params>;
	credentials?: CloudflareV1Credentials;
};

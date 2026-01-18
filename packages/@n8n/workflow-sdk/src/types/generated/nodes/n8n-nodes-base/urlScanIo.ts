/**
 * urlscan.io Node Types
 *
 * Provides various utilities for monitoring websites like health checks or screenshots
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/urlscanio/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type UrlScanIoV1ScanGetConfig = {
	resource: 'scan';
	operation: 'get';
	/**
	 * ID of the scan to retrieve
	 * @displayOptions.show { resource: ["scan"], operation: ["get"] }
	 */
	scanId?: string | Expression<string>;
};

export type UrlScanIoV1ScanGetAllConfig = {
	resource: 'scan';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["scan"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["scan"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type UrlScanIoV1ScanPerformConfig = {
	resource: 'scan';
	operation: 'perform';
	/**
	 * URL to scan
	 * @displayOptions.show { resource: ["scan"], operation: ["perform"] }
	 */
	url?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type UrlScanIoV1Params =
	| UrlScanIoV1ScanGetConfig
	| UrlScanIoV1ScanGetAllConfig
	| UrlScanIoV1ScanPerformConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface UrlScanIoV1Credentials {
	urlScanIoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type UrlScanIoV1Node = {
	type: 'n8n-nodes-base.urlScanIo';
	version: 1;
	config: NodeConfig<UrlScanIoV1Params>;
	credentials?: UrlScanIoV1Credentials;
};

export type UrlScanIoNode = UrlScanIoV1Node;

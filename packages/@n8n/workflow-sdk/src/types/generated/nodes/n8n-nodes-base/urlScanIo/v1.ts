/**
 * urlscan.io Node - Version 1
 * Provides various utilities for monitoring websites like health checks or screenshots
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Output Types
// ===========================================================================

export type UrlScanIoV1ScanPerformOutput = {
	api?: string;
	message?: string;
	result?: string;
	scanId?: string;
	url?: string;
	visibility?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface UrlScanIoV1Credentials {
	urlScanIoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface UrlScanIoV1NodeBase {
	type: 'n8n-nodes-base.urlScanIo';
	version: 1;
	credentials?: UrlScanIoV1Credentials;
}

export type UrlScanIoV1ScanGetNode = UrlScanIoV1NodeBase & {
	config: NodeConfig<UrlScanIoV1ScanGetConfig>;
};

export type UrlScanIoV1ScanGetAllNode = UrlScanIoV1NodeBase & {
	config: NodeConfig<UrlScanIoV1ScanGetAllConfig>;
};

export type UrlScanIoV1ScanPerformNode = UrlScanIoV1NodeBase & {
	config: NodeConfig<UrlScanIoV1ScanPerformConfig>;
	output?: UrlScanIoV1ScanPerformOutput;
};

export type UrlScanIoV1Node =
	| UrlScanIoV1ScanGetNode
	| UrlScanIoV1ScanGetAllNode
	| UrlScanIoV1ScanPerformNode
	;
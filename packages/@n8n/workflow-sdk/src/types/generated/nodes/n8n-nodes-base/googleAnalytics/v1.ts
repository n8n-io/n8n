/**
 * Google Analytics Node - Version 1
 * Use the Google Analytics API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Return the analytics data */
export type GoogleAnalyticsV1ReportGetConfig = {
	resource: 'report';
	operation: 'get';
/**
 * The View ID of Google Analytics. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 */
		viewId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["get"], resource: ["report"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["get"], resource: ["report"], returnAll: [false] }
 * @default 1000
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["report"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Return user activity data */
export type GoogleAnalyticsV1UserActivitySearchConfig = {
	resource: 'userActivity';
	operation: 'search';
/**
 * The View ID of Google Analytics. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["userActivity"], operation: ["search"] }
 */
		viewId: string | Expression<string>;
/**
 * ID of a user
 * @displayOptions.show { resource: ["userActivity"], operation: ["search"] }
 */
		userId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"], resource: ["userActivity"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], resource: ["userActivity"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleAnalyticsV1Credentials {
	googleAnalyticsOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleAnalyticsV1NodeBase {
	type: 'n8n-nodes-base.googleAnalytics';
	version: 1;
	credentials?: GoogleAnalyticsV1Credentials;
}

export type GoogleAnalyticsV1ReportGetNode = GoogleAnalyticsV1NodeBase & {
	config: NodeConfig<GoogleAnalyticsV1ReportGetConfig>;
};

export type GoogleAnalyticsV1UserActivitySearchNode = GoogleAnalyticsV1NodeBase & {
	config: NodeConfig<GoogleAnalyticsV1UserActivitySearchConfig>;
};

export type GoogleAnalyticsV1Node =
	| GoogleAnalyticsV1ReportGetNode
	| GoogleAnalyticsV1UserActivitySearchNode
	;
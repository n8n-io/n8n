/**
 * Google Analytics Node Types
 *
 * Use the Google Analytics API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googleanalytics/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Return the analytics data */
export type GoogleAnalyticsV2ReportGetConfig = {
	resource: 'report';
	operation: 'get';
	/**
	 * Google Analytics 4 is the latest version. Universal Analytics is an older version that is not fully functional after the end of June 2023.
	 * @default ga4
	 */
	propertyType?: 'ga4' | 'universal' | Expression<string>;
	/**
	 * The Property of Google Analytics
	 * @hint If this doesn't work, try changing the 'Property Type' field above
	 * @default {"mode":"list","value":""}
	 */
	propertyId: ResourceLocatorValue;
	dateRange:
		| 'last7days'
		| 'last30days'
		| 'today'
		| 'yesterday'
		| 'lastCalendarWeek'
		| 'lastCalendarMonth'
		| 'custom'
		| Expression<string>;
	startDate: string | Expression<string>;
	endDate: string | Expression<string>;
	/**
	 * The quantitative measurements of a report. For example, the metric eventCount is the total number of events. Requests are allowed up to 10 metrics.
	 * @default {"metricValues":[{"listName":"totalUsers"}]}
	 */
	metricsGA4?: {
		metricValues?: Array<{
			listName?:
				| 'active1DayUsers'
				| 'active28DayUsers'
				| 'active7DayUsers'
				| 'checkouts'
				| 'eventCount'
				| 'screenPageViews'
				| 'userEngagementDuration'
				| 'sessions'
				| 'sessionsPerUser'
				| 'totalUsers'
				| 'other'
				| 'custom'
				| Expression<string>;
			name?: string | Expression<string>;
			name?: string | Expression<string>;
			expression?: string | Expression<string>;
			invisible?: boolean | Expression<boolean>;
		}>;
	};
	/**
	 * Dimensions are attributes of your data. For example, the dimension city indicates the city from which an event originates. Dimension values in report responses are strings; for example, the city could be "Paris" or "New York". Requests are allowed up to 9 dimensions.
	 * @default {"dimensionValues":[{"listName":"date"}]}
	 */
	dimensionsGA4?: {
		dimensionValues?: Array<{
			listName?:
				| 'browser'
				| 'campaignName'
				| 'city'
				| 'country'
				| 'date'
				| 'deviceCategory'
				| 'itemName'
				| 'language'
				| 'pageLocation'
				| 'sourceMedium'
				| 'other'
				| Expression<string>;
			name?: string | Expression<string>;
		}>;
	};
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * The View of Google Analytics
	 * @hint If this doesn't work, try changing the 'Property Type' field above
	 * @default {"mode":"list","value":""}
	 */
	viewId: ResourceLocatorValue;
	/**
	 * Metrics in the request
	 * @default {"metricValues":[{"listName":"ga:users"}]}
	 */
	metricsUA?: {
		metricValues?: Array<{
			listName?:
				| 'ga:productCheckouts'
				| 'ga:totalEvents'
				| 'ga:pageviews'
				| 'ga:sessionDuration'
				| 'ga:sessions'
				| 'ga:sessionsPerUser'
				| 'ga:users'
				| 'other'
				| 'custom'
				| Expression<string>;
			name?: string | Expression<string>;
			name?: string | Expression<string>;
			expression?: string | Expression<string>;
			formattingType?: 'CURRENCY' | 'FLOAT' | 'INTEGER' | 'PERCENT' | 'TIME' | Expression<string>;
		}>;
	};
	/**
	 * Dimensions are attributes of your data. For example, the dimension ga:city indicates the city, for example, "Paris" or "New York", from which a session originates.
	 * @default {"dimensionValues":[{"listName":"ga:date"}]}
	 */
	dimensionsUA?: {
		dimensionValues?: Array<{
			listName?:
				| 'ga:browser'
				| 'ga:campaign'
				| 'ga:city'
				| 'ga:country'
				| 'ga:date'
				| 'ga:deviceCategory'
				| 'ga:productName'
				| 'ga:language'
				| 'ga:pagePath'
				| 'ga:sourceMedium'
				| 'other'
				| Expression<string>;
			name?: string | Expression<string>;
		}>;
	};
};

/** Return user activity data */
export type GoogleAnalyticsV2UserActivitySearchConfig = {
	resource: 'userActivity';
	operation: 'search';
	/**
	 * The view from Google Analytics. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @hint If there's nothing here, try changing the 'Property type' field above
	 */
	viewId: string | Expression<string>;
	/**
	 * ID of a user
	 */
	userId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GoogleAnalyticsV2Params =
	| GoogleAnalyticsV2ReportGetConfig
	| GoogleAnalyticsV2UserActivitySearchConfig;

/** Return the analytics data */
export type GoogleAnalyticsV1ReportGetConfig = {
	resource: 'report';
	operation: 'get';
	/**
	 * The View ID of Google Analytics. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 1000
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 */
	viewId: string | Expression<string>;
	/**
	 * ID of a user
	 */
	userId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GoogleAnalyticsV1Params =
	| GoogleAnalyticsV1ReportGetConfig
	| GoogleAnalyticsV1UserActivitySearchConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleAnalyticsV2Credentials {
	googleAnalyticsOAuth2: CredentialReference;
}

export interface GoogleAnalyticsV1Credentials {
	googleAnalyticsOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleAnalyticsV2Node = {
	type: 'n8n-nodes-base.googleAnalytics';
	version: 2;
	config: NodeConfig<GoogleAnalyticsV2Params>;
	credentials?: GoogleAnalyticsV2Credentials;
};

export type GoogleAnalyticsV1Node = {
	type: 'n8n-nodes-base.googleAnalytics';
	version: 1;
	config: NodeConfig<GoogleAnalyticsV1Params>;
	credentials?: GoogleAnalyticsV1Credentials;
};

export type GoogleAnalyticsNode = GoogleAnalyticsV2Node | GoogleAnalyticsV1Node;

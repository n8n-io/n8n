/**
 * Google Analytics Node - Version 2
 * Use the Google Analytics API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 * @default ga4
 */
		propertyType?: 'ga4' | 'universal' | Expression<string>;
/**
 * The Property of Google Analytics
 * @hint If this doesn't work, try changing the 'Property Type' field above
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["ga4"] }
 * @default {"mode":"list","value":""}
 */
		propertyId: ResourceLocatorValue;
	dateRange: 'last7days' | 'last30days' | 'today' | 'yesterday' | 'lastCalendarWeek' | 'lastCalendarMonth' | 'custom' | Expression<string>;
	startDate: string | Expression<string>;
	endDate: string | Expression<string>;
/**
 * The quantitative measurements of a report. For example, the metric eventCount is the total number of events. Requests are allowed up to 10 metrics.
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["ga4"] }
 * @default {"metricValues":[{"listName":"totalUsers"}]}
 */
		metricsGA4?: {
		metricValues?: Array<{
			/** Metric
			 * @default totalUsers
			 */
			listName?: 'active1DayUsers' | 'active28DayUsers' | 'active7DayUsers' | 'checkouts' | 'eventCount' | 'screenPageViews' | 'userEngagementDuration' | 'sessions' | 'sessionsPerUser' | 'totalUsers' | 'other' | 'custom' | Expression<string>;
			/** The name of the metric. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @hint If expression is specified, name can be any string that you would like
			 * @displayOptions.show { listName: ["other"] }
			 * @default totalUsers
			 */
			name?: string | Expression<string>;
			/** Name
			 * @displayOptions.show { listName: ["custom"] }
			 * @default custom_metric
			 */
			name?: string | Expression<string>;
			/** A mathematical expression for derived metrics. For example, the metric Event count per user is eventCount/totalUsers.
			 * @displayOptions.show { listName: ["custom"] }
			 */
			expression?: string | Expression<string>;
			/** Whether a metric is invisible in the report response. If a metric is invisible, the metric will not produce a column in the response, but can be used in metricFilter, orderBys, or a metric expression.
			 * @displayOptions.show { listName: ["custom"] }
			 * @default false
			 */
			invisible?: boolean | Expression<boolean>;
		}>;
	};
/**
 * Dimensions are attributes of your data. For example, the dimension city indicates the city from which an event originates. Dimension values in report responses are strings; for example, the city could be "Paris" or "New York". Requests are allowed up to 9 dimensions.
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["ga4"] }
 * @default {"dimensionValues":[{"listName":"date"}]}
 */
		dimensionsGA4?: {
		dimensionValues?: Array<{
			/** Dimension
			 * @default date
			 */
			listName?: 'browser' | 'campaignName' | 'city' | 'country' | 'date' | 'deviceCategory' | 'itemName' | 'language' | 'pageLocation' | 'sourceMedium' | 'other' | Expression<string>;
			/** The name of the dimension. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { listName: ["other"] }
			 * @default date
			 */
			name?: string | Expression<string>;
		}>;
	};
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["get"], resource: ["report"], propertyType: ["ga4"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["get"], resource: ["report"], propertyType: ["ga4"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["report"], propertyType: ["ga4"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * The View of Google Analytics
 * @hint If this doesn't work, try changing the 'Property Type' field above
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["universal"] }
 * @default {"mode":"list","value":""}
 */
		viewId: ResourceLocatorValue;
/**
 * Metrics in the request
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["universal"] }
 * @default {"metricValues":[{"listName":"ga:users"}]}
 */
		metricsUA?: {
		metricValues?: Array<{
			/** Metric
			 * @default ga:users
			 */
			listName?: 'ga:productCheckouts' | 'ga:totalEvents' | 'ga:pageviews' | 'ga:sessionDuration' | 'ga:sessions' | 'ga:sessionsPerUser' | 'ga:users' | 'other' | 'custom' | Expression<string>;
			/** The name of the metric. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @hint If expression is specified, name can be any string that you would like
			 * @displayOptions.show { listName: ["other"] }
			 * @default ga:users
			 */
			name?: string | Expression<string>;
			/** Name
			 * @displayOptions.show { listName: ["custom"] }
			 * @default custom_metric
			 */
			name?: string | Expression<string>;
			/** Learn more about Google Analytics &lt;a href="https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet#Metric"&gt;metric expressions&lt;/a&gt;
			 * @displayOptions.show { listName: ["custom"] }
			 */
			expression?: string | Expression<string>;
			/** Specifies how the metric expression should be formatted
			 * @displayOptions.show { listName: ["custom"] }
			 * @default INTEGER
			 */
			formattingType?: 'CURRENCY' | 'FLOAT' | 'INTEGER' | 'PERCENT' | 'TIME' | Expression<string>;
		}>;
	};
/**
 * Dimensions are attributes of your data. For example, the dimension ga:city indicates the city, for example, "Paris" or "New York", from which a session originates.
 * @displayOptions.show { resource: ["report"], operation: ["get"], propertyType: ["universal"] }
 * @default {"dimensionValues":[{"listName":"ga:date"}]}
 */
		dimensionsUA?: {
		dimensionValues?: Array<{
			/** Dimension
			 * @default ga:date
			 */
			listName?: 'ga:browser' | 'ga:campaign' | 'ga:city' | 'ga:country' | 'ga:date' | 'ga:deviceCategory' | 'ga:productName' | 'ga:language' | 'ga:pagePath' | 'ga:sourceMedium' | 'other' | Expression<string>;
			/** Name of the dimension to fetch, for example ga:browser. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @displayOptions.show { listName: ["other"] }
			 * @default ga:date
			 */
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

export type GoogleAnalyticsV2Params =
	| GoogleAnalyticsV2ReportGetConfig
	| GoogleAnalyticsV2UserActivitySearchConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleAnalyticsV2Credentials {
	googleAnalyticsOAuth2: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleAnalyticsV2Node = {
	type: 'n8n-nodes-base.googleAnalytics';
	version: 2;
	config: NodeConfig<GoogleAnalyticsV2Params>;
	credentials?: GoogleAnalyticsV2Credentials;
};
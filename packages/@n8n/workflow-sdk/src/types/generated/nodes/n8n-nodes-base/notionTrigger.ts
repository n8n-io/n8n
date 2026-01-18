/**
 * Notion Trigger Node Types
 *
 * Starts the workflow when Notion events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/notiontrigger/
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

export interface NotionTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: {
		item?: Array<{
			/** How often to trigger.
			 * @default everyDay
			 */
			mode?:
				| 'everyMinute'
				| 'everyHour'
				| 'everyDay'
				| 'everyWeek'
				| 'everyMonth'
				| 'everyX'
				| 'custom'
				| Expression<string>;
			/** The hour of the day to trigger (24h format)
			 * @displayOptions.hide { mode: ["custom", "everyHour", "everyMinute", "everyX"] }
			 * @default 14
			 */
			hour?: number | Expression<number>;
			/** The minute of the day to trigger
			 * @displayOptions.hide { mode: ["custom", "everyMinute", "everyX"] }
			 * @default 0
			 */
			minute?: number | Expression<number>;
			/** The day of the month to trigger
			 * @displayOptions.show { mode: ["everyMonth"] }
			 * @default 1
			 */
			dayOfMonth?: number | Expression<number>;
			/** The weekday to trigger
			 * @displayOptions.show { mode: ["everyWeek"] }
			 * @default 1
			 */
			weekday?: '1' | '2' | '3' | '4' | '5' | '6' | '0' | Expression<string>;
			/** Use custom cron expression. Values and ranges as follows:&lt;ul&gt;&lt;li&gt;Seconds: 0-59&lt;/li&gt;&lt;li&gt;Minutes: 0 - 59&lt;/li&gt;&lt;li&gt;Hours: 0 - 23&lt;/li&gt;&lt;li&gt;Day of Month: 1 - 31&lt;/li&gt;&lt;li&gt;Months: 0 - 11 (Jan - Dec)&lt;/li&gt;&lt;li&gt;Day of Week: 0 - 6 (Sun - Sat)&lt;/li&gt;&lt;/ul&gt;
			 * @displayOptions.show { mode: ["custom"] }
			 * @default * * * * * *
			 */
			cronExpression?: string | Expression<string>;
			/** All how many X minutes/hours it should trigger
			 * @displayOptions.show { mode: ["everyX"] }
			 * @default 2
			 */
			value?: number | Expression<number>;
			/** If it should trigger all X minutes or hours
			 * @displayOptions.show { mode: ["everyX"] }
			 * @default hours
			 */
			unit?: 'minutes' | 'hours' | Expression<string>;
		}>;
	};
	event: 'pageAddedToDatabase' | 'pagedUpdatedInDatabase' | Expression<string>;
	/**
	 * The Notion Database to operate on
	 * @displayOptions.show { event: ["pageAddedToDatabase", "pagedUpdatedInDatabase"] }
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @displayOptions.show { event: ["pageAddedToDatabase", "pagedUpdatedInDatabase"] }
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface NotionTriggerV1Credentials {
	notionApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type NotionTriggerV1Node = {
	type: 'n8n-nodes-base.notionTrigger';
	version: 1;
	config: NodeConfig<NotionTriggerV1Params>;
	credentials?: NotionTriggerV1Credentials;
	isTrigger: true;
};

export type NotionTriggerNode = NotionTriggerV1Node;

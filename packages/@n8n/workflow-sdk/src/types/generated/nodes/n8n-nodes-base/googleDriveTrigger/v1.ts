/**
 * Google Drive Trigger Node - Version 1
 * Starts the workflow when Google Drive events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface GoogleDriveTriggerV1Params {
/**
 * Time at which polling should occur
 * @default {"item":[{"mode":"everyMinute"}]}
 */
		pollTimes?: {
		item?: Array<{
			/** How often to trigger.
			 * @default everyDay
			 */
			mode?: 'everyMinute' | 'everyHour' | 'everyDay' | 'everyWeek' | 'everyMonth' | 'everyX' | 'custom' | Expression<string>;
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
	authentication?: 'oAuth2' | 'serviceAccount' | Expression<string>;
	triggerOn: 'specificFile' | 'specificFolder' | Expression<string>;
	fileToWatch: ResourceLocatorValue;
/**
 * When to trigger this node
 * @displayOptions.show { triggerOn: ["specificFile"] }
 * @default fileUpdated
 */
		event: 'fileUpdated' | Expression<string>;
	folderToWatch: ResourceLocatorValue;
/**
 * The drive to monitor. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { triggerOn: ["anyFileFolder"] }
 * @default root
 */
		driveToWatch: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDriveTriggerV1Credentials {
	googleApi: CredentialReference;
	googleDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleDriveTriggerV1NodeBase {
	type: 'n8n-nodes-base.googleDriveTrigger';
	version: 1;
	credentials?: GoogleDriveTriggerV1Credentials;
	isTrigger: true;
}

export type GoogleDriveTriggerV1ParamsNode = GoogleDriveTriggerV1NodeBase & {
	config: NodeConfig<GoogleDriveTriggerV1Params>;
};

export type GoogleDriveTriggerV1Node = GoogleDriveTriggerV1ParamsNode;
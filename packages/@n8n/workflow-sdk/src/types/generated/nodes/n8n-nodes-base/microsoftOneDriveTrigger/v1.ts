/**
 * Microsoft OneDrive Trigger Node - Version 1
 * Trigger for Microsoft OneDrive API.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftOneDriveTriggerV1Config {
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
	event?: 'fileCreated' | 'fileUpdated' | 'folderCreated' | 'folderUpdated' | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @default true
 */
		simple?: boolean | Expression<boolean>;
/**
 * Whether to watch for the created file in a given folder, rather than the entire OneDrive
 * @displayOptions.show { event: ["fileCreated"] }
 * @default false
 */
		watchFolder?: boolean | Expression<boolean>;
/**
 * How to select which file to watch
 * @displayOptions.show { event: ["fileUpdated"] }
 * @default anyFile
 */
		watch?: 'anyFile' | 'selectedFolder' | 'selectedFile' | Expression<string>;
/**
 * The file to operate on. The 'By URL' option only accepts URLs that start with 'https://onedrive.live.com'.
 * @displayOptions.show { event: ["fileUpdated"], watch: ["selectedFile"] }
 * @default {"mode":"id","value":""}
 */
		fileId: ResourceLocatorValue;
/**
 * The folder to operate on. The 'By URL' option only accepts URLs that start with 'https://onedrive.live.com'.
 * @displayOptions.show { watch: ["selectedFolder", "oneSelectedFolder"] }
 * @default {"mode":"id","value":"","cachedResultName":""}
 */
		folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOneDriveTriggerV1Credentials {
	microsoftOneDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftOneDriveTriggerV1NodeBase {
	type: 'n8n-nodes-base.microsoftOneDriveTrigger';
	version: 1;
	credentials?: MicrosoftOneDriveTriggerV1Credentials;
	isTrigger: true;
}

export type MicrosoftOneDriveTriggerV1Node = MicrosoftOneDriveTriggerV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveTriggerV1Config>;
};

export type MicrosoftOneDriveTriggerV1Node = MicrosoftOneDriveTriggerV1Node;
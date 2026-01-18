/**
 * Google Drive Trigger Node Types
 *
 * Starts the workflow when Google Drive events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googledrivetrigger/
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

export interface GoogleDriveTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: {
		item?: Array<{
			mode?:
				| 'everyMinute'
				| 'everyHour'
				| 'everyDay'
				| 'everyWeek'
				| 'everyMonth'
				| 'everyX'
				| 'custom'
				| Expression<string>;
			hour?: number | Expression<number>;
			minute?: number | Expression<number>;
			dayOfMonth?: number | Expression<number>;
			weekday?: '1' | '2' | '3' | '4' | '5' | '6' | '0' | Expression<string>;
			cronExpression?: string | Expression<string>;
			value?: number | Expression<number>;
			unit?: 'minutes' | 'hours' | Expression<string>;
		}>;
	};
	authentication?: 'oAuth2' | 'serviceAccount' | Expression<string>;
	triggerOn: 'specificFile' | 'specificFolder' | Expression<string>;
	fileToWatch: ResourceLocatorValue;
	/**
	 * When to trigger this node
	 * @default fileUpdated
	 */
	event: 'fileUpdated' | Expression<string>;
	folderToWatch: ResourceLocatorValue;
	/**
	 * The drive to monitor. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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

export type GoogleDriveTriggerV1Node = {
	type: 'n8n-nodes-base.googleDriveTrigger';
	version: 1;
	config: NodeConfig<GoogleDriveTriggerV1Params>;
	credentials?: GoogleDriveTriggerV1Credentials;
	isTrigger: true;
};

export type GoogleDriveTriggerNode = GoogleDriveTriggerV1Node;

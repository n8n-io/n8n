/**
 * Google Business Profile Trigger Node Types
 *
 * Fetches reviews from Google Business Profile and starts the workflow on specified polling intervals.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlebusinessprofiletrigger/
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

export interface GoogleBusinessProfileTriggerV1Params {
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
	event: 'reviewAdded' | Expression<string>;
	/**
	 * The Google Business Profile account
	 * @default {"mode":"list","value":""}
	 */
	account: ResourceLocatorValue;
	/**
	 * The specific location or business associated with the account
	 * @default {"mode":"list","value":""}
	 */
	location: ResourceLocatorValue;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBusinessProfileTriggerV1Credentials {
	googleBusinessProfileOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleBusinessProfileTriggerV1Node = {
	type: 'n8n-nodes-base.googleBusinessProfileTrigger';
	version: 1;
	config: NodeConfig<GoogleBusinessProfileTriggerV1Params>;
	credentials?: GoogleBusinessProfileTriggerV1Credentials;
	isTrigger: true;
};

export type GoogleBusinessProfileTriggerNode = GoogleBusinessProfileTriggerV1Node;

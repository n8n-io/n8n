/**
 * Google Calendar Trigger Node Types
 *
 * Starts the workflow when Google Calendar events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlecalendartrigger/
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

export interface GoogleCalendarTriggerV1Params {
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
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendarId: ResourceLocatorValue;
	triggerOn:
		| 'eventCancelled'
		| 'eventCreated'
		| 'eventEnded'
		| 'eventStarted'
		| 'eventUpdated'
		| Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCalendarTriggerV1Credentials {
	googleCalendarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleCalendarTriggerV1Node = {
	type: 'n8n-nodes-base.googleCalendarTrigger';
	version: 1;
	config: NodeConfig<GoogleCalendarTriggerV1Params>;
	credentials?: GoogleCalendarTriggerV1Credentials;
	isTrigger: true;
};

export type GoogleCalendarTriggerNode = GoogleCalendarTriggerV1Node;

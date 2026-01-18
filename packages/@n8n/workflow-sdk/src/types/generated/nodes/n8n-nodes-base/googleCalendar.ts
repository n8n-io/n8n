/**
 * Google Calendar Node Types
 *
 * Consume Google Calendar API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlecalendar/
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

/** If a time-slot is available in a calendar */
export type GoogleCalendarV13CalendarAvailabilityConfig = {
	resource: 'calendar';
	operation: 'availability';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
	/**
	 * Start of the interval
	 */
	timeMin: string | Expression<string>;
	/**
	 * End of the interval
	 */
	timeMax: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Add a event to calendar */
export type GoogleCalendarV13EventCreateConfig = {
	resource: 'event';
	operation: 'create';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
	/**
	 * Start time of the event
	 */
	start: string | Expression<string>;
	/**
	 * End time of the event
	 */
	end: string | Expression<string>;
	useDefaultReminders?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * If the event doesn't use the default reminders, this lists the reminders specific to the event
	 * @default {}
	 */
	remindersUi?: Record<string, unknown>;
};

/** Delete an event */
export type GoogleCalendarV13EventDeleteConfig = {
	resource: 'event';
	operation: 'delete';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve an event */
export type GoogleCalendarV13EventGetConfig = {
	resource: 'event';
	operation: 'get';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve many events from a calendar */
export type GoogleCalendarV13EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
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
	 * At least some part of the event must be after this time, use &lt;a href="https://docs.n8n.io/code/cookbook/luxon/" target="_blank"&gt;expression&lt;/a&gt; to set a date, or switch to fixed mode to choose date from widget
	 * @default ={{ $now }}
	 */
	timeMin?: string | Expression<string>;
	/**
	 * At least some part of the event must be before this time, use &lt;a href="https://docs.n8n.io/code/cookbook/luxon/" target="_blank"&gt;expression&lt;/a&gt; to set a date, or switch to fixed mode to choose date from widget
	 * @default ={{ $now.plus({ week: 1 }) }}
	 */
	timeMax?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update an event */
export type GoogleCalendarV13EventUpdateConfig = {
	resource: 'event';
	operation: 'update';
	/**
	 * Google Calendar to operate on
	 * @default {"mode":"list","value":""}
	 */
	calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	modifyTarget?: 'instance' | 'event' | Expression<string>;
	useDefaultReminders?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	/**
	 * If the event doesn't use the default reminders, this lists the reminders specific to the event
	 * @default {}
	 */
	remindersUi?: Record<string, unknown>;
};

export type GoogleCalendarV13Params =
	| GoogleCalendarV13CalendarAvailabilityConfig
	| GoogleCalendarV13EventCreateConfig
	| GoogleCalendarV13EventDeleteConfig
	| GoogleCalendarV13EventGetConfig
	| GoogleCalendarV13EventGetAllConfig
	| GoogleCalendarV13EventUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCalendarV13Credentials {
	googleCalendarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleCalendarNode = {
	type: 'n8n-nodes-base.googleCalendar';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<GoogleCalendarV13Params>;
	credentials?: GoogleCalendarV13Credentials;
};

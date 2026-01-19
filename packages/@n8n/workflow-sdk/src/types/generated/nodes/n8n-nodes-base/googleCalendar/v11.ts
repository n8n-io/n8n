/**
 * Google Calendar Node - Version 1.1
 * Consume Google Calendar API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** If a time-slot is available in a calendar */
export type GoogleCalendarV11CalendarAvailabilityConfig = {
	resource: 'calendar';
	operation: 'availability';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["calendar"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Add a event to calendar */
export type GoogleCalendarV11EventCreateConfig = {
	resource: 'event';
	operation: 'create';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["event"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
	useDefaultReminders?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * If the event doesn't use the default reminders, this lists the reminders specific to the event
 * @displayOptions.show { resource: ["event"], operation: ["create"], useDefaultReminders: [false] }
 * @default {}
 */
		remindersUi?: {
		remindersValues?: Array<{
			/** Method
			 */
			method?: 'email' | 'popup' | Expression<string>;
			/** Minutes Before
			 * @default 0
			 */
			minutes?: number | Expression<number>;
		}>;
	};
};

/** Delete an event */
export type GoogleCalendarV11EventDeleteConfig = {
	resource: 'event';
	operation: 'delete';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["event"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve an event */
export type GoogleCalendarV11EventGetConfig = {
	resource: 'event';
	operation: 'get';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["event"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve many events from a calendar */
export type GoogleCalendarV11EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["event"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["event"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["event"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an event */
export type GoogleCalendarV11EventUpdateConfig = {
	resource: 'event';
	operation: 'update';
/**
 * Google Calendar to operate on
 * @displayOptions.show { resource: ["event"] }
 * @default {"mode":"list","value":""}
 */
		calendar: ResourceLocatorValue;
	eventId: string | Expression<string>;
	useDefaultReminders?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
/**
 * If the event doesn't use the default reminders, this lists the reminders specific to the event
 * @displayOptions.show { resource: ["event"], operation: ["update"], useDefaultReminders: [false] }
 * @default {}
 */
		remindersUi?: {
		remindersValues?: Array<{
			/** Method
			 */
			method?: 'email' | 'popup' | Expression<string>;
			/** Minutes Before
			 * @default 0
			 */
			minutes?: number | Expression<number>;
		}>;
	};
};

export type GoogleCalendarV11Params =
	| GoogleCalendarV11CalendarAvailabilityConfig
	| GoogleCalendarV11EventCreateConfig
	| GoogleCalendarV11EventDeleteConfig
	| GoogleCalendarV11EventGetConfig
	| GoogleCalendarV11EventGetAllConfig
	| GoogleCalendarV11EventUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCalendarV11Credentials {
	googleCalendarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleCalendarV11NodeBase {
	type: 'n8n-nodes-base.googleCalendar';
	version: 1.1;
	credentials?: GoogleCalendarV11Credentials;
}

export type GoogleCalendarV11CalendarAvailabilityNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11CalendarAvailabilityConfig>;
};

export type GoogleCalendarV11EventCreateNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11EventCreateConfig>;
};

export type GoogleCalendarV11EventDeleteNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11EventDeleteConfig>;
};

export type GoogleCalendarV11EventGetNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11EventGetConfig>;
};

export type GoogleCalendarV11EventGetAllNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11EventGetAllConfig>;
};

export type GoogleCalendarV11EventUpdateNode = GoogleCalendarV11NodeBase & {
	config: NodeConfig<GoogleCalendarV11EventUpdateConfig>;
};

export type GoogleCalendarV11Node =
	| GoogleCalendarV11CalendarAvailabilityNode
	| GoogleCalendarV11EventCreateNode
	| GoogleCalendarV11EventDeleteNode
	| GoogleCalendarV11EventGetNode
	| GoogleCalendarV11EventGetAllNode
	| GoogleCalendarV11EventUpdateNode
	;
/**
 * Google Calendar Node - Version 1.3
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
export type GoogleCalendarV13CalendarAvailabilityConfig = {
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
export type GoogleCalendarV13EventCreateConfig = {
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
export type GoogleCalendarV13EventDeleteConfig = {
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
export type GoogleCalendarV13EventGetConfig = {
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
export type GoogleCalendarV13EventGetAllConfig = {
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
export type GoogleCalendarV13EventUpdateConfig = {
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

export type GoogleCalendarV13Params =
	| GoogleCalendarV13CalendarAvailabilityConfig
	| GoogleCalendarV13EventCreateConfig
	| GoogleCalendarV13EventDeleteConfig
	| GoogleCalendarV13EventGetConfig
	| GoogleCalendarV13EventGetAllConfig
	| GoogleCalendarV13EventUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCalendarV13Credentials {
	googleCalendarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleCalendarV13NodeBase {
	type: 'n8n-nodes-base.googleCalendar';
	version: 1.3;
	credentials?: GoogleCalendarV13Credentials;
}

export type GoogleCalendarV13CalendarAvailabilityNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13CalendarAvailabilityConfig>;
};

export type GoogleCalendarV13EventCreateNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13EventCreateConfig>;
};

export type GoogleCalendarV13EventDeleteNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13EventDeleteConfig>;
};

export type GoogleCalendarV13EventGetNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13EventGetConfig>;
};

export type GoogleCalendarV13EventGetAllNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13EventGetAllConfig>;
};

export type GoogleCalendarV13EventUpdateNode = GoogleCalendarV13NodeBase & {
	config: NodeConfig<GoogleCalendarV13EventUpdateConfig>;
};

export type GoogleCalendarV13Node =
	| GoogleCalendarV13CalendarAvailabilityNode
	| GoogleCalendarV13EventCreateNode
	| GoogleCalendarV13EventDeleteNode
	| GoogleCalendarV13EventGetNode
	| GoogleCalendarV13EventGetAllNode
	| GoogleCalendarV13EventUpdateNode
	;
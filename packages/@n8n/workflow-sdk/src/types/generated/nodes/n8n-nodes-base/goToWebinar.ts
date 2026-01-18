/**
 * GoToWebinar Node Types
 *
 * Consume the GoToWebinar API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/gotowebinar/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoToWebinarV1AttendeeGetConfig = {
	resource: 'attendee';
	operation: 'get';
	/**
	 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	sessionKey: string | Expression<string>;
	/**
	 * Registrant key of the attendee at the webinar session
	 */
	registrantKey: string | Expression<string>;
};

export type GoToWebinarV1AttendeeGetAllConfig = {
	resource: 'attendee';
	operation: 'getAll';
	/**
	 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	sessionKey: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type GoToWebinarV1AttendeeGetDetailsConfig = {
	resource: 'attendee';
	operation: 'getDetails';
	/**
	 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	sessionKey: string | Expression<string>;
	/**
	 * Registrant key of the attendee at the webinar session
	 */
	registrantKey: string | Expression<string>;
	/**
	 * The details to retrieve for the attendee
	 */
	details: 'polls' | 'questions' | 'surveyAnswers' | Expression<string>;
};

export type GoToWebinarV1CoorganizerCreateConfig = {
	resource: 'coorganizer';
	operation: 'create';
	/**
	 * Key of the webinar that the co-organizer is hosting. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Whether the co-organizer has no GoToWebinar account
	 * @default false
	 */
	isExternal: boolean | Expression<boolean>;
	/**
	 * The co-organizer's organizer key for the webinar
	 */
	organizerKey?: string | Expression<string>;
	/**
	 * The co-organizer's given name
	 */
	givenName?: string | Expression<string>;
	/**
	 * The co-organizer's email address
	 */
	email?: string | Expression<string>;
};

export type GoToWebinarV1CoorganizerDeleteConfig = {
	resource: 'coorganizer';
	operation: 'delete';
	/**
	 * Key of the webinar to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the co-organizer to delete
	 */
	coorganizerKey?: string | Expression<string>;
	/**
	 * By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.
	 * @default false
	 */
	isExternal: boolean | Expression<boolean>;
};

export type GoToWebinarV1CoorganizerGetAllConfig = {
	resource: 'coorganizer';
	operation: 'getAll';
	/**
	 * Key of the webinar to retrieve all co-organizers from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type GoToWebinarV1CoorganizerReinviteConfig = {
	resource: 'coorganizer';
	operation: 'reinvite';
	/**
	 * By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the co-organizer to reinvite
	 */
	coorganizerKey?: string | Expression<string>;
	/**
	 * Whether the co-organizer has no GoToWebinar account
	 * @default false
	 */
	isExternal: boolean | Expression<boolean>;
};

export type GoToWebinarV1PanelistCreateConfig = {
	resource: 'panelist';
	operation: 'create';
	/**
	 * Name of the panelist to create
	 */
	name: string | Expression<string>;
	/**
	 * Email address of the panelist to create
	 */
	email: string | Expression<string>;
	/**
	 * Key of the webinar that the panelist will present at. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
};

export type GoToWebinarV1PanelistDeleteConfig = {
	resource: 'panelist';
	operation: 'delete';
	/**
	 * Key of the webinar to delete the panelist from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the panelist to delete
	 */
	panelistKey: string | Expression<string>;
};

export type GoToWebinarV1PanelistGetAllConfig = {
	resource: 'panelist';
	operation: 'getAll';
	/**
	 * Key of the webinar to retrieve all panelists from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type GoToWebinarV1PanelistReinviteConfig = {
	resource: 'panelist';
	operation: 'reinvite';
	/**
	 * Key of the webinar to reinvite the panelist to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the panelist to reinvite
	 */
	panelistKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantCreateConfig = {
	resource: 'registrant';
	operation: 'create';
	/**
	 * Key of the webinar of the registrant to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * First name of the registrant to create
	 */
	firstName?: string | Expression<string>;
	/**
	 * Last name of the registrant to create
	 */
	lastName?: string | Expression<string>;
	/**
	 * Email address of the registrant to create
	 */
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GoToWebinarV1RegistrantDeleteConfig = {
	resource: 'registrant';
	operation: 'delete';
	/**
	 * Key of the webinar of the registrant to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the registrant to delete
	 */
	registrantKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantGetConfig = {
	resource: 'registrant';
	operation: 'get';
	/**
	 * Key of the webinar of the registrant to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Key of the registrant to retrieve
	 */
	registrantKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantGetAllConfig = {
	resource: 'registrant';
	operation: 'getAll';
	/**
	 * The key of the webinar to retrieve registrants from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
};

export type GoToWebinarV1SessionGetConfig = {
	resource: 'session';
	operation: 'get';
	/**
	 * Key of the webinar to which the session belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	sessionKey: string | Expression<string>;
};

export type GoToWebinarV1SessionGetAllConfig = {
	resource: 'session';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GoToWebinarV1SessionGetDetailsConfig = {
	resource: 'session';
	operation: 'getDetails';
	/**
	 * Key of the webinar to which the session belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	webinarKey: string | Expression<string>;
	sessionKey: string | Expression<string>;
	details?: 'performance' | 'polls' | 'questions' | 'surveys' | Expression<string>;
};

export type GoToWebinarV1WebinarCreateConfig = {
	resource: 'webinar';
	operation: 'create';
	subject: string | Expression<string>;
	times: {
		timesProperties?: Array<{
			startTime?: string | Expression<string>;
			endTime?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

export type GoToWebinarV1WebinarGetConfig = {
	resource: 'webinar';
	operation: 'get';
	/**
	 * Key of the webinar to retrieve
	 */
	webinarKey: string | Expression<string>;
};

export type GoToWebinarV1WebinarGetAllConfig = {
	resource: 'webinar';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GoToWebinarV1WebinarUpdateConfig = {
	resource: 'webinar';
	operation: 'update';
	/**
	 * Key of the webinar to update
	 */
	webinarKey: string | Expression<string>;
	notifyParticipants: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

export type GoToWebinarV1Params =
	| GoToWebinarV1AttendeeGetConfig
	| GoToWebinarV1AttendeeGetAllConfig
	| GoToWebinarV1AttendeeGetDetailsConfig
	| GoToWebinarV1CoorganizerCreateConfig
	| GoToWebinarV1CoorganizerDeleteConfig
	| GoToWebinarV1CoorganizerGetAllConfig
	| GoToWebinarV1CoorganizerReinviteConfig
	| GoToWebinarV1PanelistCreateConfig
	| GoToWebinarV1PanelistDeleteConfig
	| GoToWebinarV1PanelistGetAllConfig
	| GoToWebinarV1PanelistReinviteConfig
	| GoToWebinarV1RegistrantCreateConfig
	| GoToWebinarV1RegistrantDeleteConfig
	| GoToWebinarV1RegistrantGetConfig
	| GoToWebinarV1RegistrantGetAllConfig
	| GoToWebinarV1SessionGetConfig
	| GoToWebinarV1SessionGetAllConfig
	| GoToWebinarV1SessionGetDetailsConfig
	| GoToWebinarV1WebinarCreateConfig
	| GoToWebinarV1WebinarGetConfig
	| GoToWebinarV1WebinarGetAllConfig
	| GoToWebinarV1WebinarUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoToWebinarV1Credentials {
	goToWebinarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoToWebinarV1Node = {
	type: 'n8n-nodes-base.goToWebinar';
	version: 1;
	config: NodeConfig<GoToWebinarV1Params>;
	credentials?: GoToWebinarV1Credentials;
};

export type GoToWebinarNode = GoToWebinarV1Node;

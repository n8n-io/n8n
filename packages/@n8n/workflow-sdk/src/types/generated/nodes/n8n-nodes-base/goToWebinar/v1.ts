/**
 * GoToWebinar Node - Version 1
 * Consume the GoToWebinar API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GoToWebinarV1AttendeeGetConfig = {
	resource: 'attendee';
	operation: 'get';
/**
 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		sessionKey: string | Expression<string>;
/**
 * Registrant key of the attendee at the webinar session
 * @displayOptions.show { resource: ["attendee"], operation: ["get"] }
 */
		registrantKey: string | Expression<string>;
};

export type GoToWebinarV1AttendeeGetAllConfig = {
	resource: 'attendee';
	operation: 'getAll';
/**
 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		sessionKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["attendee"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["attendee"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type GoToWebinarV1AttendeeGetDetailsConfig = {
	resource: 'attendee';
	operation: 'getDetails';
/**
 * Key of the webinar that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the session that the attendee attended. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["attendee"] }
 */
		sessionKey: string | Expression<string>;
/**
 * Registrant key of the attendee at the webinar session
 * @displayOptions.show { resource: ["attendee"], operation: ["getDetails"] }
 */
		registrantKey: string | Expression<string>;
/**
 * The details to retrieve for the attendee
 * @displayOptions.show { resource: ["attendee"], operation: ["getDetails"] }
 */
		details: 'polls' | 'questions' | 'surveyAnswers' | Expression<string>;
};

export type GoToWebinarV1CoorganizerCreateConfig = {
	resource: 'coorganizer';
	operation: 'create';
/**
 * Key of the webinar that the co-organizer is hosting. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["coorganizer"], operation: ["create"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Whether the co-organizer has no GoToWebinar account
 * @displayOptions.show { resource: ["coorganizer"], operation: ["create"] }
 * @default false
 */
		isExternal: boolean | Expression<boolean>;
/**
 * The co-organizer's organizer key for the webinar
 * @displayOptions.show { resource: ["coorganizer"], operation: ["create"], isExternal: [false] }
 */
		organizerKey?: string | Expression<string>;
/**
 * The co-organizer's given name
 * @displayOptions.show { resource: ["coorganizer"], operation: ["create"], isExternal: [true] }
 */
		givenName?: string | Expression<string>;
/**
 * The co-organizer's email address
 * @displayOptions.show { resource: ["coorganizer"], operation: ["create"], isExternal: [true] }
 */
		email?: string | Expression<string>;
};

export type GoToWebinarV1CoorganizerDeleteConfig = {
	resource: 'coorganizer';
	operation: 'delete';
/**
 * Key of the webinar to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["coorganizer"], operation: ["delete"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the co-organizer to delete
 * @displayOptions.show { resource: ["coorganizer"], operation: ["delete"] }
 */
		coorganizerKey?: string | Expression<string>;
/**
 * By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.
 * @displayOptions.show { resource: ["coorganizer"], operation: ["delete"] }
 * @default false
 */
		isExternal: boolean | Expression<boolean>;
};

export type GoToWebinarV1CoorganizerGetAllConfig = {
	resource: 'coorganizer';
	operation: 'getAll';
/**
 * Key of the webinar to retrieve all co-organizers from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["coorganizer"], operation: ["getAll"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["coorganizer"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["coorganizer"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type GoToWebinarV1CoorganizerReinviteConfig = {
	resource: 'coorganizer';
	operation: 'reinvite';
/**
 * By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.
 * @displayOptions.show { resource: ["coorganizer"], operation: ["reinvite"] }
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the co-organizer to reinvite
 * @displayOptions.show { resource: ["coorganizer"], operation: ["reinvite"] }
 */
		coorganizerKey?: string | Expression<string>;
/**
 * Whether the co-organizer has no GoToWebinar account
 * @displayOptions.show { resource: ["coorganizer"], operation: ["reinvite"] }
 * @default false
 */
		isExternal: boolean | Expression<boolean>;
};

export type GoToWebinarV1PanelistCreateConfig = {
	resource: 'panelist';
	operation: 'create';
/**
 * Name of the panelist to create
 * @displayOptions.show { resource: ["panelist"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Email address of the panelist to create
 * @displayOptions.show { resource: ["panelist"], operation: ["create"] }
 */
		email: string | Expression<string>;
/**
 * Key of the webinar that the panelist will present at. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["panelist"], operation: ["create"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
};

export type GoToWebinarV1PanelistDeleteConfig = {
	resource: 'panelist';
	operation: 'delete';
/**
 * Key of the webinar to delete the panelist from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["panelist"], operation: ["delete"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the panelist to delete
 * @displayOptions.show { resource: ["panelist"], operation: ["delete"] }
 */
		panelistKey: string | Expression<string>;
};

export type GoToWebinarV1PanelistGetAllConfig = {
	resource: 'panelist';
	operation: 'getAll';
/**
 * Key of the webinar to retrieve all panelists from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["panelist"], operation: ["getAll"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["panelist"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["panelist"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type GoToWebinarV1PanelistReinviteConfig = {
	resource: 'panelist';
	operation: 'reinvite';
/**
 * Key of the webinar to reinvite the panelist to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["panelist"], operation: ["reinvite"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the panelist to reinvite
 * @displayOptions.show { resource: ["panelist"], operation: ["reinvite"] }
 */
		panelistKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantCreateConfig = {
	resource: 'registrant';
	operation: 'create';
/**
 * Key of the webinar of the registrant to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["registrant"], operation: ["create"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * First name of the registrant to create
 * @displayOptions.show { resource: ["registrant"], operation: ["create"] }
 */
		firstName?: string | Expression<string>;
/**
 * Last name of the registrant to create
 * @displayOptions.show { resource: ["registrant"], operation: ["create"] }
 */
		lastName?: string | Expression<string>;
/**
 * Email address of the registrant to create
 * @displayOptions.show { resource: ["registrant"], operation: ["create"] }
 */
		email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GoToWebinarV1RegistrantDeleteConfig = {
	resource: 'registrant';
	operation: 'delete';
/**
 * Key of the webinar of the registrant to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["registrant"], operation: ["delete"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the registrant to delete
 * @displayOptions.show { resource: ["registrant"], operation: ["delete"] }
 */
		registrantKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantGetConfig = {
	resource: 'registrant';
	operation: 'get';
/**
 * Key of the webinar of the registrant to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["registrant"], operation: ["get"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Key of the registrant to retrieve
 * @displayOptions.show { resource: ["registrant"], operation: ["get"] }
 */
		registrantKey: string | Expression<string>;
};

export type GoToWebinarV1RegistrantGetAllConfig = {
	resource: 'registrant';
	operation: 'getAll';
/**
 * The key of the webinar to retrieve registrants from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["registrant"], operation: ["getAll"] }
 * @default []
 */
		webinarKey: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["registrant"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["registrant"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
};

export type GoToWebinarV1SessionGetConfig = {
	resource: 'session';
	operation: 'get';
/**
 * Key of the webinar to which the session belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["session"], operation: ["get", "getDetails"] }
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
 * @displayOptions.show { resource: ["session"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["session"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["session"], operation: ["get", "getDetails"] }
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
			/** Start Time
			 */
			startTime?: string | Expression<string>;
			/** End Time
			 */
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
 * @displayOptions.show { resource: ["webinar"], operation: ["get"] }
 */
		webinarKey: string | Expression<string>;
};

export type GoToWebinarV1WebinarGetAllConfig = {
	resource: 'webinar';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["webinar"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["webinar"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["webinar"], operation: ["update"] }
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
	| GoToWebinarV1WebinarUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoToWebinarV1Credentials {
	goToWebinarOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoToWebinarV1NodeBase {
	type: 'n8n-nodes-base.goToWebinar';
	version: 1;
	credentials?: GoToWebinarV1Credentials;
}

export type GoToWebinarV1AttendeeGetNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1AttendeeGetConfig>;
};

export type GoToWebinarV1AttendeeGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1AttendeeGetAllConfig>;
};

export type GoToWebinarV1AttendeeGetDetailsNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1AttendeeGetDetailsConfig>;
};

export type GoToWebinarV1CoorganizerCreateNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1CoorganizerCreateConfig>;
};

export type GoToWebinarV1CoorganizerDeleteNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1CoorganizerDeleteConfig>;
};

export type GoToWebinarV1CoorganizerGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1CoorganizerGetAllConfig>;
};

export type GoToWebinarV1CoorganizerReinviteNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1CoorganizerReinviteConfig>;
};

export type GoToWebinarV1PanelistCreateNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1PanelistCreateConfig>;
};

export type GoToWebinarV1PanelistDeleteNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1PanelistDeleteConfig>;
};

export type GoToWebinarV1PanelistGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1PanelistGetAllConfig>;
};

export type GoToWebinarV1PanelistReinviteNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1PanelistReinviteConfig>;
};

export type GoToWebinarV1RegistrantCreateNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1RegistrantCreateConfig>;
};

export type GoToWebinarV1RegistrantDeleteNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1RegistrantDeleteConfig>;
};

export type GoToWebinarV1RegistrantGetNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1RegistrantGetConfig>;
};

export type GoToWebinarV1RegistrantGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1RegistrantGetAllConfig>;
};

export type GoToWebinarV1SessionGetNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1SessionGetConfig>;
};

export type GoToWebinarV1SessionGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1SessionGetAllConfig>;
};

export type GoToWebinarV1SessionGetDetailsNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1SessionGetDetailsConfig>;
};

export type GoToWebinarV1WebinarCreateNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1WebinarCreateConfig>;
};

export type GoToWebinarV1WebinarGetNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1WebinarGetConfig>;
};

export type GoToWebinarV1WebinarGetAllNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1WebinarGetAllConfig>;
};

export type GoToWebinarV1WebinarUpdateNode = GoToWebinarV1NodeBase & {
	config: NodeConfig<GoToWebinarV1WebinarUpdateConfig>;
};

export type GoToWebinarV1Node =
	| GoToWebinarV1AttendeeGetNode
	| GoToWebinarV1AttendeeGetAllNode
	| GoToWebinarV1AttendeeGetDetailsNode
	| GoToWebinarV1CoorganizerCreateNode
	| GoToWebinarV1CoorganizerDeleteNode
	| GoToWebinarV1CoorganizerGetAllNode
	| GoToWebinarV1CoorganizerReinviteNode
	| GoToWebinarV1PanelistCreateNode
	| GoToWebinarV1PanelistDeleteNode
	| GoToWebinarV1PanelistGetAllNode
	| GoToWebinarV1PanelistReinviteNode
	| GoToWebinarV1RegistrantCreateNode
	| GoToWebinarV1RegistrantDeleteNode
	| GoToWebinarV1RegistrantGetNode
	| GoToWebinarV1RegistrantGetAllNode
	| GoToWebinarV1SessionGetNode
	| GoToWebinarV1SessionGetAllNode
	| GoToWebinarV1SessionGetDetailsNode
	| GoToWebinarV1WebinarCreateNode
	| GoToWebinarV1WebinarGetNode
	| GoToWebinarV1WebinarGetAllNode
	| GoToWebinarV1WebinarUpdateNode
	;
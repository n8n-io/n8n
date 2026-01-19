/**
 * Gong Node - Version 1
 * Interact with Gong API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve data for a specific call */
export type GongV1CallGetConfig = {
	resource: 'call';
	operation: 'get';
	call: ResourceLocatorValue;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of calls */
export type GongV1CallGetAllConfig = {
	resource: 'call';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["call"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["call"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific call */
export type GongV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of calls */
export type GongV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type GongV1Params =
	| GongV1CallGetConfig
	| GongV1CallGetAllConfig
	| GongV1UserGetConfig
	| GongV1UserGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type GongV1CallGetOutput = {
	metaData?: {
		customData?: null;
		direction?: string;
		duration?: number;
		id?: string;
		isPrivate?: boolean;
		language?: string;
		media?: string;
		meetingUrl?: string;
		primaryUserId?: string;
		purpose?: null;
		scheduled?: string;
		scope?: string;
		started?: string;
		system?: string;
		title?: string;
		url?: string;
		workspaceId?: string;
	};
	parties?: Array<{
		affiliation?: string;
		emailAddress?: string;
		id?: string;
		methods?: Array<string>;
		name?: string;
		phoneNumber?: string;
		title?: string;
		userId?: string;
	}>;
	transcript?: Array<{
		sentences?: Array<{
			end?: number;
			start?: number;
			text?: string;
		}>;
		speakerId?: string;
	}>;
};

export type GongV1CallGetAllOutput = {
	customData?: null;
	direction?: string;
	duration?: number;
	id?: string;
	isPrivate?: boolean;
	language?: string;
	media?: string;
	meetingUrl?: string;
	primaryUserId?: string;
	purpose?: null;
	scheduled?: string;
	scope?: string;
	started?: string;
	system?: string;
	title?: string;
	url?: string;
	workspaceId?: string;
};

export type GongV1UserGetOutput = {
	active?: boolean;
	created?: string;
	emailAddress?: string;
	emailAliases?: Array<string>;
	extension?: null;
	firstName?: string;
	id?: string;
	lastName?: string;
	settings?: {
		emailsImported?: boolean;
		gongConnectEnabled?: boolean;
		nonRecordedMeetingsImported?: boolean;
		preventEmailImport?: boolean;
		preventWebConferenceRecording?: boolean;
		telephonyCallsImported?: boolean;
		webConferencesRecorded?: boolean;
	};
	spokenLanguages?: Array<{
		language?: string;
		primary?: boolean;
	}>;
	trustedEmailAddress?: null;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface GongV1Credentials {
	gongApi: CredentialReference;
	gongOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GongV1NodeBase {
	type: 'n8n-nodes-base.gong';
	version: 1;
	credentials?: GongV1Credentials;
}

export type GongV1CallGetNode = GongV1NodeBase & {
	config: NodeConfig<GongV1CallGetConfig>;
	output?: GongV1CallGetOutput;
};

export type GongV1CallGetAllNode = GongV1NodeBase & {
	config: NodeConfig<GongV1CallGetAllConfig>;
	output?: GongV1CallGetAllOutput;
};

export type GongV1UserGetNode = GongV1NodeBase & {
	config: NodeConfig<GongV1UserGetConfig>;
	output?: GongV1UserGetOutput;
};

export type GongV1UserGetAllNode = GongV1NodeBase & {
	config: NodeConfig<GongV1UserGetAllConfig>;
};

export type GongV1Node =
	| GongV1CallGetNode
	| GongV1CallGetAllNode
	| GongV1UserGetNode
	| GongV1UserGetAllNode
	;
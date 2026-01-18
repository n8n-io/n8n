/**
 * Webex by Cisco Node Types
 *
 * Consume the Cisco Webex API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ciscowebex/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CiscoWebexV1MeetingCreateConfig = {
	resource: 'meeting';
	operation: 'create';
	/**
	 * Meeting title. The title can be a maximum of 128 characters long.
	 */
	title: string | Expression<string>;
	/**
	 * Date and time for the start of the meeting. Acceptable &lt;a href="https://datatracker.ietf.org/doc/html/rfc2445"&gt; format&lt;/a&gt;.
	 */
	start: string | Expression<string>;
	/**
	 * Date and time for the end of the meeting. Acceptable &lt;a href="https://datatracker.ietf.org/doc/html/rfc2445"&gt; format&lt;/a&gt;.
	 */
	end: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingDeleteConfig = {
	resource: 'meeting';
	operation: 'delete';
	/**
	 * ID of the meeting
	 */
	meetingId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingGetConfig = {
	resource: 'meeting';
	operation: 'get';
	/**
	 * ID of the meeting
	 */
	meetingId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingGetAllConfig = {
	resource: 'meeting';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingUpdateConfig = {
	resource: 'meeting';
	operation: 'update';
	/**
	 * ID of the meeting
	 */
	meetingId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CiscoWebexV1MessageCreateConfig = {
	resource: 'message';
	operation: 'create';
	destination: 'room' | 'person' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	roomId: string | Expression<string>;
	specifyPersonBy: 'email' | 'id' | Expression<string>;
	toPersonId: string | Expression<string>;
	toPersonEmail: string | Expression<string>;
	/**
	 * The message, in plain text
	 */
	text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CiscoWebexV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	/**
	 * ID of the message to delete
	 */
	messageId: string | Expression<string>;
};

export type CiscoWebexV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	/**
	 * ID of the message to retrieve
	 */
	messageId: string | Expression<string>;
};

export type CiscoWebexV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * List messages in a room, by ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	roomId: string | Expression<string>;
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
	filters?: Record<string, unknown>;
};

export type CiscoWebexV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	/**
	 * ID of the message to update
	 */
	messageId: string | Expression<string>;
	/**
	 * Whether the message uses markdown
	 * @default false
	 */
	markdown: boolean | Expression<boolean>;
	/**
	 * The message, in plain text
	 */
	text: string | Expression<string>;
	/**
	 * The message, in Markdown format. The maximum message length is 7439 bytes.
	 */
	markdownText: string | Expression<string>;
};

export type CiscoWebexV1Params =
	| CiscoWebexV1MeetingCreateConfig
	| CiscoWebexV1MeetingDeleteConfig
	| CiscoWebexV1MeetingGetConfig
	| CiscoWebexV1MeetingGetAllConfig
	| CiscoWebexV1MeetingUpdateConfig
	| CiscoWebexV1MessageCreateConfig
	| CiscoWebexV1MessageDeleteConfig
	| CiscoWebexV1MessageGetConfig
	| CiscoWebexV1MessageGetAllConfig
	| CiscoWebexV1MessageUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CiscoWebexV1Credentials {
	ciscoWebexOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CiscoWebexNode = {
	type: 'n8n-nodes-base.ciscoWebex';
	version: 1;
	config: NodeConfig<CiscoWebexV1Params>;
	credentials?: CiscoWebexV1Credentials;
};

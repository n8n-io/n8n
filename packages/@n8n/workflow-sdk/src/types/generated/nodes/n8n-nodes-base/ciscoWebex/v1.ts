/**
 * Webex by Cisco Node - Version 1
 * Consume the Cisco Webex API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CiscoWebexV1MeetingCreateConfig = {
	resource: 'meeting';
	operation: 'create';
/**
 * Meeting title. The title can be a maximum of 128 characters long.
 * @displayOptions.show { resource: ["meeting"], operation: ["create"] }
 */
		title: string | Expression<string>;
/**
 * Date and time for the start of the meeting. Acceptable &lt;a href="https://datatracker.ietf.org/doc/html/rfc2445"&gt; format&lt;/a&gt;.
 * @displayOptions.show { resource: ["meeting"], operation: ["create"] }
 */
		start: string | Expression<string>;
/**
 * Date and time for the end of the meeting. Acceptable &lt;a href="https://datatracker.ietf.org/doc/html/rfc2445"&gt; format&lt;/a&gt;.
 * @displayOptions.show { resource: ["meeting"], operation: ["create"] }
 */
		end: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingDeleteConfig = {
	resource: 'meeting';
	operation: 'delete';
/**
 * ID of the meeting
 * @displayOptions.show { resource: ["meeting"], operation: ["delete"] }
 */
		meetingId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingGetConfig = {
	resource: 'meeting';
	operation: 'get';
/**
 * ID of the meeting
 * @displayOptions.show { resource: ["meeting"], operation: ["get"] }
 */
		meetingId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CiscoWebexV1MeetingGetAllConfig = {
	resource: 'meeting';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["meeting"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["meeting"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["meeting"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["message"], operation: ["create"], destination: ["room"] }
 */
		roomId: string | Expression<string>;
	specifyPersonBy: 'email' | 'id' | Expression<string>;
	toPersonId: string | Expression<string>;
	toPersonEmail: string | Expression<string>;
/**
 * The message, in plain text
 * @displayOptions.show { resource: ["message"], operation: ["create"] }
 */
		text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CiscoWebexV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
/**
 * ID of the message to delete
 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
 */
		messageId: string | Expression<string>;
};

export type CiscoWebexV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
/**
 * ID of the message to retrieve
 * @displayOptions.show { resource: ["message"], operation: ["get"] }
 */
		messageId: string | Expression<string>;
};

export type CiscoWebexV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * List messages in a room, by ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 */
		roomId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["message"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 */
		messageId: string | Expression<string>;
/**
 * Whether the message uses markdown
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 * @default false
 */
		markdown: boolean | Expression<boolean>;
/**
 * The message, in plain text
 * @displayOptions.show { resource: ["message"], operation: ["update"], markdown: [false] }
 */
		text: string | Expression<string>;
/**
 * The message, in Markdown format. The maximum message length is 7439 bytes.
 * @displayOptions.show { resource: ["message"], operation: ["update"], markdown: [true] }
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
	| CiscoWebexV1MessageUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CiscoWebexV1Credentials {
	ciscoWebexOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CiscoWebexV1NodeBase {
	type: 'n8n-nodes-base.ciscoWebex';
	version: 1;
	credentials?: CiscoWebexV1Credentials;
}

export type CiscoWebexV1MeetingCreateNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MeetingCreateConfig>;
};

export type CiscoWebexV1MeetingDeleteNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MeetingDeleteConfig>;
};

export type CiscoWebexV1MeetingGetNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MeetingGetConfig>;
};

export type CiscoWebexV1MeetingGetAllNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MeetingGetAllConfig>;
};

export type CiscoWebexV1MeetingUpdateNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MeetingUpdateConfig>;
};

export type CiscoWebexV1MessageCreateNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MessageCreateConfig>;
};

export type CiscoWebexV1MessageDeleteNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MessageDeleteConfig>;
};

export type CiscoWebexV1MessageGetNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MessageGetConfig>;
};

export type CiscoWebexV1MessageGetAllNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MessageGetAllConfig>;
};

export type CiscoWebexV1MessageUpdateNode = CiscoWebexV1NodeBase & {
	config: NodeConfig<CiscoWebexV1MessageUpdateConfig>;
};

export type CiscoWebexV1Node =
	| CiscoWebexV1MeetingCreateNode
	| CiscoWebexV1MeetingDeleteNode
	| CiscoWebexV1MeetingGetNode
	| CiscoWebexV1MeetingGetAllNode
	| CiscoWebexV1MeetingUpdateNode
	| CiscoWebexV1MessageCreateNode
	| CiscoWebexV1MessageDeleteNode
	| CiscoWebexV1MessageGetNode
	| CiscoWebexV1MessageGetAllNode
	| CiscoWebexV1MessageUpdateNode
	;
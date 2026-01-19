/**
 * Matrix Node - Version 1
 * Consume Matrix API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get current user's account information */
export type MatrixV1AccountMeConfig = {
	resource: 'account';
	operation: 'me';
};

/** Get single event by ID */
export type MatrixV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
/**
 * The room related to the event
 * @displayOptions.show { operation: ["get"], resource: ["event"] }
 */
		roomId: string | Expression<string>;
/**
 * The room related to the event
 * @displayOptions.show { operation: ["get"], resource: ["event"] }
 */
		eventId: string | Expression<string>;
};

/** Send media to a chat room */
export type MatrixV1MediaUploadConfig = {
	resource: 'media';
	operation: 'upload';
/**
 * Room ID to post. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["media"], operation: ["upload"] }
 */
		roomId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
/**
 * Type of file being uploaded
 * @displayOptions.show { resource: ["media"], operation: ["upload"] }
 * @default image
 */
		mediaType: 'file' | 'image' | 'audio' | 'video' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Send a message to a room */
export type MatrixV1MessageCreateConfig = {
	resource: 'message';
	operation: 'create';
/**
 * The channel to send the message to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["message"] }
 */
		roomId: string | Expression<string>;
/**
 * The text to send
 * @displayOptions.show { operation: ["create"], resource: ["message"] }
 */
		text?: string | Expression<string>;
/**
 * The type of message to send
 * @displayOptions.show { operation: ["create"], resource: ["message"] }
 * @default m.text
 */
		messageType?: 'm.emote' | 'm.notice' | 'm.text' | Expression<string>;
/**
 * The format of the message's body
 * @displayOptions.show { operation: ["create"], resource: ["message"] }
 * @default plain
 */
		messageFormat?: 'plain' | 'org.matrix.custom.html' | Expression<string>;
/**
 * A plain text message to display in case the HTML cannot be rendered by the Matrix client
 * @displayOptions.show { resource: ["message"], operation: ["create"], messageFormat: ["org.matrix.custom.html"] }
 */
		fallbackText?: string | Expression<string>;
};

/** Get many messages from a room */
export type MatrixV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 */
		roomId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["message"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	otherOptions?: Record<string, unknown>;
};

/** Send a message to a room */
export type MatrixV1RoomCreateConfig = {
	resource: 'room';
	operation: 'create';
	roomName: string | Expression<string>;
	preset: 'private_chat' | 'public_chat' | Expression<string>;
	roomAlias?: string | Expression<string>;
};

/** Invite a user to a room */
export type MatrixV1RoomInviteConfig = {
	resource: 'room';
	operation: 'invite';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["room"], operation: ["invite"] }
 */
		roomId: string | Expression<string>;
/**
 * The fully qualified user ID of the invitee
 * @displayOptions.show { resource: ["room"], operation: ["invite"] }
 */
		userId: string | Expression<string>;
};

/** Join a new room */
export type MatrixV1RoomJoinConfig = {
	resource: 'room';
	operation: 'join';
	roomIdOrAlias: string | Expression<string>;
};

/** Kick a user from a room */
export type MatrixV1RoomKickConfig = {
	resource: 'room';
	operation: 'kick';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["room"], operation: ["kick"] }
 */
		roomId: string | Expression<string>;
/**
 * The fully qualified user ID
 * @displayOptions.show { resource: ["room"], operation: ["kick"] }
 */
		userId: string | Expression<string>;
/**
 * Reason for kick
 * @displayOptions.show { resource: ["room"], operation: ["kick"] }
 */
		reason?: string | Expression<string>;
};

/** Leave a room */
export type MatrixV1RoomLeaveConfig = {
	resource: 'room';
	operation: 'leave';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["room"], operation: ["leave"] }
 */
		roomId: string | Expression<string>;
};

/** Get many messages from a room */
export type MatrixV1RoomMemberGetAllConfig = {
	resource: 'roomMember';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["roomMember"], operation: ["getAll"] }
 */
		roomId: string | Expression<string>;
/**
 * Filtering options
 * @displayOptions.show { resource: ["roomMember"], operation: ["getAll"] }
 * @default {}
 */
		filters?: Record<string, unknown>;
};

export type MatrixV1Params =
	| MatrixV1AccountMeConfig
	| MatrixV1EventGetConfig
	| MatrixV1MediaUploadConfig
	| MatrixV1MessageCreateConfig
	| MatrixV1MessageGetAllConfig
	| MatrixV1RoomCreateConfig
	| MatrixV1RoomInviteConfig
	| MatrixV1RoomJoinConfig
	| MatrixV1RoomKickConfig
	| MatrixV1RoomLeaveConfig
	| MatrixV1RoomMemberGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type MatrixV1MessageCreateOutput = {
	event_id?: string;
};

export type MatrixV1MessageGetAllOutput = {
	age?: number;
	content?: {
		body?: string;
		msgtype?: string;
	};
	event_id?: string;
	origin_server_ts?: number;
	room_id?: string;
	sender?: string;
	type?: string;
	unsigned?: {
		age?: number;
		membership?: string;
		transaction_id?: string;
	};
	user_id?: string;
};

export type MatrixV1RoomMemberGetAllOutput = {
	age?: number;
	content?: {
		avatar_url?: string;
		displayname?: string;
		membership?: string;
	};
	event_id?: string;
	origin_server_ts?: number;
	replaces_state?: string;
	room_id?: string;
	sender?: string;
	state_key?: string;
	type?: string;
	unsigned?: {
		age?: number;
		replaces_state?: string;
	};
	user_id?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MatrixV1Credentials {
	matrixApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MatrixV1NodeBase {
	type: 'n8n-nodes-base.matrix';
	version: 1;
	credentials?: MatrixV1Credentials;
}

export type MatrixV1AccountMeNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1AccountMeConfig>;
};

export type MatrixV1EventGetNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1EventGetConfig>;
};

export type MatrixV1MediaUploadNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1MediaUploadConfig>;
};

export type MatrixV1MessageCreateNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1MessageCreateConfig>;
	output?: MatrixV1MessageCreateOutput;
};

export type MatrixV1MessageGetAllNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1MessageGetAllConfig>;
	output?: MatrixV1MessageGetAllOutput;
};

export type MatrixV1RoomCreateNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomCreateConfig>;
};

export type MatrixV1RoomInviteNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomInviteConfig>;
};

export type MatrixV1RoomJoinNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomJoinConfig>;
};

export type MatrixV1RoomKickNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomKickConfig>;
};

export type MatrixV1RoomLeaveNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomLeaveConfig>;
};

export type MatrixV1RoomMemberGetAllNode = MatrixV1NodeBase & {
	config: NodeConfig<MatrixV1RoomMemberGetAllConfig>;
	output?: MatrixV1RoomMemberGetAllOutput;
};

export type MatrixV1Node =
	| MatrixV1AccountMeNode
	| MatrixV1EventGetNode
	| MatrixV1MediaUploadNode
	| MatrixV1MessageCreateNode
	| MatrixV1MessageGetAllNode
	| MatrixV1RoomCreateNode
	| MatrixV1RoomInviteNode
	| MatrixV1RoomJoinNode
	| MatrixV1RoomKickNode
	| MatrixV1RoomLeaveNode
	| MatrixV1RoomMemberGetAllNode
	;
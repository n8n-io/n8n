/**
 * Matrix Node Types
 *
 * Consume Matrix API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/matrix/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	roomId: string | Expression<string>;
	/**
	 * The room related to the event
	 */
	eventId: string | Expression<string>;
};

/** Send media to a chat room */
export type MatrixV1MediaUploadConfig = {
	resource: 'media';
	operation: 'upload';
	/**
	 * Room ID to post. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	roomId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Type of file being uploaded
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
	 */
	roomId: string | Expression<string>;
	/**
	 * The text to send
	 */
	text?: string | Expression<string>;
	/**
	 * The type of message to send
	 * @default m.text
	 */
	messageType?: 'm.emote' | 'm.notice' | 'm.text' | Expression<string>;
	/**
	 * The format of the message's body
	 * @default plain
	 */
	messageFormat?: 'plain' | 'org.matrix.custom.html' | Expression<string>;
	/**
	 * A plain text message to display in case the HTML cannot be rendered by the Matrix client
	 */
	fallbackText?: string | Expression<string>;
};

/** Get many messages from a room */
export type MatrixV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	roomId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	roomId: string | Expression<string>;
	/**
	 * The fully qualified user ID of the invitee
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
	 */
	roomId: string | Expression<string>;
	/**
	 * The fully qualified user ID
	 */
	userId: string | Expression<string>;
	/**
	 * Reason for kick
	 */
	reason?: string | Expression<string>;
};

/** Leave a room */
export type MatrixV1RoomLeaveConfig = {
	resource: 'room';
	operation: 'leave';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	roomId: string | Expression<string>;
};

/** Get many messages from a room */
export type MatrixV1RoomMemberGetAllConfig = {
	resource: 'roomMember';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	roomId: string | Expression<string>;
	/**
	 * Filtering options
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
	| MatrixV1RoomMemberGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MatrixV1Credentials {
	matrixApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MatrixV1Node = {
	type: 'n8n-nodes-base.matrix';
	version: 1;
	config: NodeConfig<MatrixV1Params>;
	credentials?: MatrixV1Credentials;
};

export type MatrixNode = MatrixV1Node;

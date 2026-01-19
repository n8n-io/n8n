/**
 * Pushbullet Node - Version 1
 * Consume Pushbullet API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a push */
export type PushbulletV1PushCreateConfig = {
	resource: 'push';
	operation: 'create';
	type: 'file' | 'link' | 'note' | Expression<string>;
/**
 * Title of the push
 * @displayOptions.show { resource: ["push"], operation: ["create"], type: ["note", "link"] }
 */
		title: string | Expression<string>;
/**
 * Body of the push
 * @displayOptions.show { resource: ["push"], operation: ["create"], type: ["note", "link", "file"] }
 */
		body: string | Expression<string>;
/**
 * URL of the push
 * @displayOptions.show { resource: ["push"], operation: ["create"], type: ["link"] }
 */
		url: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
/**
 * Define the medium that will be used to send the push
 * @displayOptions.show { resource: ["push"], operation: ["create"] }
 * @default default
 */
		target: 'channel_tag' | 'default' | 'device_iden' | 'email' | Expression<string>;
/**
 * The value to be set depending on the target selected. For example, if the target selected is email then this field would take the email address of the person you are trying to send the push to.
 * @displayOptions.show { resource: ["push"], operation: ["create"] }
 * @displayOptions.hide { target: ["default", "device_iden"] }
 */
		value: string | Expression<string>;
};

/** Delete a push */
export type PushbulletV1PushDeleteConfig = {
	resource: 'push';
	operation: 'delete';
	pushId: string | Expression<string>;
};

/** Get many pushes */
export type PushbulletV1PushGetAllConfig = {
	resource: 'push';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["push"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["push"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a push */
export type PushbulletV1PushUpdateConfig = {
	resource: 'push';
	operation: 'update';
	pushId: string | Expression<string>;
/**
 * Whether to mark a push as having been dismissed by the user, will cause any notifications for the push to be hidden if possible
 * @displayOptions.show { resource: ["push"], operation: ["update"] }
 * @default false
 */
		dismissed: boolean | Expression<boolean>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type PushbulletV1PushCreateOutput = {
	active?: boolean;
	body?: string;
	client_iden?: string;
	created?: number;
	direction?: string;
	dismissed?: boolean;
	iden?: string;
	modified?: number;
	receiver_email?: string;
	receiver_email_normalized?: string;
	receiver_iden?: string;
	sender_name?: string;
	title?: string;
	type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushbulletV1Credentials {
	pushbulletOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PushbulletV1NodeBase {
	type: 'n8n-nodes-base.pushbullet';
	version: 1;
	credentials?: PushbulletV1Credentials;
}

export type PushbulletV1PushCreateNode = PushbulletV1NodeBase & {
	config: NodeConfig<PushbulletV1PushCreateConfig>;
	output?: PushbulletV1PushCreateOutput;
};

export type PushbulletV1PushDeleteNode = PushbulletV1NodeBase & {
	config: NodeConfig<PushbulletV1PushDeleteConfig>;
};

export type PushbulletV1PushGetAllNode = PushbulletV1NodeBase & {
	config: NodeConfig<PushbulletV1PushGetAllConfig>;
};

export type PushbulletV1PushUpdateNode = PushbulletV1NodeBase & {
	config: NodeConfig<PushbulletV1PushUpdateConfig>;
};

export type PushbulletV1Node =
	| PushbulletV1PushCreateNode
	| PushbulletV1PushDeleteNode
	| PushbulletV1PushGetAllNode
	| PushbulletV1PushUpdateNode
	;
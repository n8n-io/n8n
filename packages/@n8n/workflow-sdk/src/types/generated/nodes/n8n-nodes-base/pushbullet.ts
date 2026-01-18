/**
 * Pushbullet Node Types
 *
 * Consume Pushbullet API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/pushbullet/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	title: string | Expression<string>;
	/**
	 * Body of the push
	 */
	body: string | Expression<string>;
	/**
	 * URL of the push
	 */
	url: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Define the medium that will be used to send the push
	 * @default default
	 */
	target: 'channel_tag' | 'default' | 'device_iden' | 'email' | Expression<string>;
	/**
	 * The value to be set depending on the target selected. For example, if the target selected is email then this field would take the email address of the person you are trying to send the push to.
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	dismissed: boolean | Expression<boolean>;
};

export type PushbulletV1Params =
	| PushbulletV1PushCreateConfig
	| PushbulletV1PushDeleteConfig
	| PushbulletV1PushGetAllConfig
	| PushbulletV1PushUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushbulletV1Credentials {
	pushbulletOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PushbulletNode = {
	type: 'n8n-nodes-base.pushbullet';
	version: 1;
	config: NodeConfig<PushbulletV1Params>;
	credentials?: PushbulletV1Credentials;
};

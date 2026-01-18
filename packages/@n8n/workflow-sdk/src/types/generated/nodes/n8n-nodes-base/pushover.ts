/**
 * Pushover Node Types
 *
 * Consume Pushover API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/pushover/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type PushoverV1MessagePushConfig = {
	resource: 'message';
	operation: 'push';
	/**
	 * The user/group key (not e-mail address) of your user (or you), viewable when logged into the &lt;a href="https://pushover.net/"&gt;dashboard&lt;/a&gt; (often referred to as &lt;code&gt;USER_KEY&lt;/code&gt; in the &lt;a href="https://support.pushover.net/i44-example-code-and-pushover-libraries"&gt;libraries&lt;/a&gt; and code examples)
	 */
	userKey: string | Expression<string>;
	/**
	 * Your message
	 */
	message: string | Expression<string>;
	/**
	 * Send as -2 to generate no notification/alert, -1 to always send as a quiet notification, 1 to display as high-priority and bypass the user's quiet hours, or 2 to also require confirmation from the user
	 * @default -2
	 */
	priority?: -2 | -1 | 0 | 1 | 2 | Expression<number>;
	/**
	 * Specifies how often (in seconds) the Pushover servers will send the same notification to the user. This parameter must have a value of at least 30 seconds between retries.
	 * @default 30
	 */
	retry: number | Expression<number>;
	/**
	 * Specifies how many seconds your notification will continue to be retried for (every retry seconds)
	 * @default 30
	 */
	expire: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type PushoverV1Params = PushoverV1MessagePushConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushoverV1Credentials {
	pushoverApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PushoverV1Node = {
	type: 'n8n-nodes-base.pushover';
	version: 1;
	config: NodeConfig<PushoverV1Params>;
	credentials?: PushoverV1Credentials;
};

export type PushoverNode = PushoverV1Node;

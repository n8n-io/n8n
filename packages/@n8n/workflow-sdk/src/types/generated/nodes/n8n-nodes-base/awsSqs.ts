/**
 * AWS SQS Node Types
 *
 * Sends messages to AWS SQS
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awssqs/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsSqsV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'sendMessage' | Expression<string>;
	/**
	 * Queue to send a message to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	queue: string | Expression<string>;
	queueType?: 'fifo' | 'standard' | Expression<string>;
	/**
	 * Whether to send the data the node receives as JSON to SQS
	 * @default true
	 */
	sendInputData?: boolean | Expression<boolean>;
	/**
	 * Message to send to the queue
	 */
	message: string | Expression<string>;
	/**
	 * Tag that specifies that a message belongs to a specific message group. Applies only to FIFO (first-in-first-out) queues.
	 */
	messageGroupId: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsSqsV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsSqsNode = {
	type: 'n8n-nodes-base.awsSqs';
	version: 1;
	config: NodeConfig<AwsSqsV1Params>;
	credentials?: AwsSqsV1Credentials;
};

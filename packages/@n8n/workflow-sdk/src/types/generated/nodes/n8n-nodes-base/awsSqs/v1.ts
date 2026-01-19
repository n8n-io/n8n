/**
 * AWS SQS Node - Version 1
 * Sends messages to AWS SQS
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsSqsV1Config {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'sendMessage' | Expression<string>;
/**
 * Queue to send a message to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["sendMessage"] }
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
 * @displayOptions.show { operation: ["sendMessage"], sendInputData: [false] }
 */
		message: string | Expression<string>;
/**
 * Tag that specifies that a message belongs to a specific message group. Applies only to FIFO (first-in-first-out) queues.
 * @displayOptions.show { queueType: ["fifo"] }
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
// Node Types
// ===========================================================================

interface AwsSqsV1NodeBase {
	type: 'n8n-nodes-base.awsSqs';
	version: 1;
	credentials?: AwsSqsV1Credentials;
}

export type AwsSqsV1Node = AwsSqsV1NodeBase & {
	config: NodeConfig<AwsSqsV1Config>;
};

export type AwsSqsV1Node = AwsSqsV1Node;
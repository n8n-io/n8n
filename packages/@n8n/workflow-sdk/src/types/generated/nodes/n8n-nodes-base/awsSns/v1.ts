/**
 * AWS SNS Node - Version 1
 * Sends data to AWS SNS
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsSnsV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	operation?: 'create' | 'delete' | 'publish' | Expression<string>;
	name: string | Expression<string>;
	options?: Record<string, unknown>;
	topic: ResourceLocatorValue;
/**
 * Subject when the message is delivered to email endpoints
 * @displayOptions.show { operation: ["publish"] }
 */
		subject: string | Expression<string>;
/**
 * The message you want to send
 * @displayOptions.show { operation: ["publish"] }
 */
		message: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsSnsV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsSnsV1NodeBase {
	type: 'n8n-nodes-base.awsSns';
	version: 1;
	credentials?: AwsSnsV1Credentials;
}

export type AwsSnsV1ParamsNode = AwsSnsV1NodeBase & {
	config: NodeConfig<AwsSnsV1Params>;
};

export type AwsSnsV1Node = AwsSnsV1ParamsNode;
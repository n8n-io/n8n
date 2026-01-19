/**
 * AWS SNS Trigger Node - Version 1
 * Handle AWS SNS events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface AwsSnsTriggerV1Params {
	authentication?: 'iam' | 'assumeRole' | Expression<string>;
	topic: ResourceLocatorValue;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsSnsTriggerV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsSnsTriggerV1NodeBase {
	type: 'n8n-nodes-base.awsSnsTrigger';
	version: 1;
	credentials?: AwsSnsTriggerV1Credentials;
	isTrigger: true;
}

export type AwsSnsTriggerV1ParamsNode = AwsSnsTriggerV1NodeBase & {
	config: NodeConfig<AwsSnsTriggerV1Params>;
};

export type AwsSnsTriggerV1Node = AwsSnsTriggerV1ParamsNode;
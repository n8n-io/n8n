/**
 * AWS SNS Trigger Node - Version 1
 * Handle AWS SNS events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type AwsSnsTriggerV1Node = {
	type: 'n8n-nodes-base.awsSnsTrigger';
	version: 1;
	config: NodeConfig<AwsSnsTriggerV1Params>;
	credentials?: AwsSnsTriggerV1Credentials;
	isTrigger: true;
};
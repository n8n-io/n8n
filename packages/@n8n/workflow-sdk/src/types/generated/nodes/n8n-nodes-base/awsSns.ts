/**
 * AWS SNS Node Types
 *
 * Sends data to AWS SNS
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awssns/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	subject: string | Expression<string>;
	/**
	 * The message you want to send
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

export type AwsSnsV1Node = {
	type: 'n8n-nodes-base.awsSns';
	version: 1;
	config: NodeConfig<AwsSnsV1Params>;
	credentials?: AwsSnsV1Credentials;
};

export type AwsSnsNode = AwsSnsV1Node;

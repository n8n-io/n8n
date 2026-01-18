/**
 * Humantic AI Node Types
 *
 * Consume Humantic AI API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/humanticai/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a profile */
export type HumanticAiV1ProfileCreateConfig = {
	resource: 'profile';
	operation: 'create';
	/**
	 * The LinkedIn profile URL or email ID for creating a Humantic profile. If you are sending the resume, this should be a unique string.
	 */
	userId: string | Expression<string>;
	/**
	 * Whether to send a resume for a resume based analysis
	 * @default false
	 */
	sendResume?: boolean | Expression<boolean>;
	binaryPropertyName?: string | Expression<string>;
};

/** Retrieve a profile */
export type HumanticAiV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
	/**
	 * This value is the same as the User ID that was provided when the analysis was created. This could be a LinkedIn URL, email ID, or a unique string in case of resume based analysis.
	 */
	userId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update a profile */
export type HumanticAiV1ProfileUpdateConfig = {
	resource: 'profile';
	operation: 'update';
	/**
	 * This value is the same as the User ID that was provided when the analysis was created. Currently only supported for profiles created using LinkedIn URL.
	 */
	userId: string | Expression<string>;
	/**
	 * Whether to send a resume for a resume of the user
	 * @default false
	 */
	sendResume?: boolean | Expression<boolean>;
	/**
	 * Additional text written by the user
	 */
	text?: string | Expression<string>;
	binaryPropertyName?: string | Expression<string>;
};

export type HumanticAiV1Params =
	| HumanticAiV1ProfileCreateConfig
	| HumanticAiV1ProfileGetConfig
	| HumanticAiV1ProfileUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HumanticAiV1Credentials {
	humanticAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HumanticAiV1Node = {
	type: 'n8n-nodes-base.humanticAi';
	version: 1;
	config: NodeConfig<HumanticAiV1Params>;
	credentials?: HumanticAiV1Credentials;
};

export type HumanticAiNode = HumanticAiV1Node;

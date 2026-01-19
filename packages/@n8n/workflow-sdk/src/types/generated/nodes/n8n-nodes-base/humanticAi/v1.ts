/**
 * Humantic AI Node - Version 1
 * Consume Humantic AI API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a profile */
export type HumanticAiV1ProfileCreateConfig = {
	resource: 'profile';
	operation: 'create';
/**
 * The LinkedIn profile URL or email ID for creating a Humantic profile. If you are sending the resume, this should be a unique string.
 * @displayOptions.show { operation: ["create"], resource: ["profile"] }
 */
		userId: string | Expression<string>;
/**
 * Whether to send a resume for a resume based analysis
 * @displayOptions.show { operation: ["create"], resource: ["profile"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["profile"] }
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
 * @displayOptions.show { operation: ["update"], resource: ["profile"] }
 */
		userId: string | Expression<string>;
/**
 * Whether to send a resume for a resume of the user
 * @displayOptions.show { operation: ["update"], resource: ["profile"] }
 * @default false
 */
		sendResume?: boolean | Expression<boolean>;
/**
 * Additional text written by the user
 * @displayOptions.show { operation: ["update"], resource: ["profile"], sendResume: [false] }
 */
		text?: string | Expression<string>;
	binaryPropertyName?: string | Expression<string>;
};

export type HumanticAiV1Params =
	| HumanticAiV1ProfileCreateConfig
	| HumanticAiV1ProfileGetConfig
	| HumanticAiV1ProfileUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HumanticAiV1Credentials {
	humanticAiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HumanticAiV1NodeBase {
	type: 'n8n-nodes-base.humanticAi';
	version: 1;
	credentials?: HumanticAiV1Credentials;
}

export type HumanticAiV1ProfileCreateNode = HumanticAiV1NodeBase & {
	config: NodeConfig<HumanticAiV1ProfileCreateConfig>;
};

export type HumanticAiV1ProfileGetNode = HumanticAiV1NodeBase & {
	config: NodeConfig<HumanticAiV1ProfileGetConfig>;
};

export type HumanticAiV1ProfileUpdateNode = HumanticAiV1NodeBase & {
	config: NodeConfig<HumanticAiV1ProfileUpdateConfig>;
};

export type HumanticAiV1Node =
	| HumanticAiV1ProfileCreateNode
	| HumanticAiV1ProfileGetNode
	| HumanticAiV1ProfileUpdateNode
	;
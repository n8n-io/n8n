/**
 * Microsoft Graph Security Node - Version 1
 * Consume the Microsoft Graph Security API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MicrosoftGraphSecurityV1SecureScoreGetConfig = {
	resource: 'secureScore';
	operation: 'get';
/**
 * ID of the secure score to retrieve
 * @displayOptions.show { resource: ["secureScore"], operation: ["get"] }
 */
		secureScoreId: string | Expression<string>;
};

export type MicrosoftGraphSecurityV1SecureScoreGetAllConfig = {
	resource: 'secureScore';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["secureScore"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["secureScore"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileGetConfig = {
	resource: 'secureScoreControlProfile';
	operation: 'get';
/**
 * ID of the secure score control profile to retrieve
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["get"] }
 */
		secureScoreControlProfileId: string | Expression<string>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllConfig = {
	resource: 'secureScoreControlProfile';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileUpdateConfig = {
	resource: 'secureScoreControlProfile';
	operation: 'update';
/**
 * ID of the secure score control profile to update
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["update"] }
 */
		secureScoreControlProfileId: string | Expression<string>;
/**
 * Name of the provider of the security product or service
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["update"] }
 */
		provider: string | Expression<string>;
/**
 * Name of the vendor of the security product or service
 * @displayOptions.show { resource: ["secureScoreControlProfile"], operation: ["update"] }
 */
		vendor: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftGraphSecurityV1Credentials {
	microsoftGraphSecurityOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftGraphSecurityV1NodeBase {
	type: 'n8n-nodes-base.microsoftGraphSecurity';
	version: 1;
	credentials?: MicrosoftGraphSecurityV1Credentials;
}

export type MicrosoftGraphSecurityV1SecureScoreGetNode = MicrosoftGraphSecurityV1NodeBase & {
	config: NodeConfig<MicrosoftGraphSecurityV1SecureScoreGetConfig>;
};

export type MicrosoftGraphSecurityV1SecureScoreGetAllNode = MicrosoftGraphSecurityV1NodeBase & {
	config: NodeConfig<MicrosoftGraphSecurityV1SecureScoreGetAllConfig>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileGetNode = MicrosoftGraphSecurityV1NodeBase & {
	config: NodeConfig<MicrosoftGraphSecurityV1SecureScoreControlProfileGetConfig>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllNode = MicrosoftGraphSecurityV1NodeBase & {
	config: NodeConfig<MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllConfig>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileUpdateNode = MicrosoftGraphSecurityV1NodeBase & {
	config: NodeConfig<MicrosoftGraphSecurityV1SecureScoreControlProfileUpdateConfig>;
};

export type MicrosoftGraphSecurityV1Node =
	| MicrosoftGraphSecurityV1SecureScoreGetNode
	| MicrosoftGraphSecurityV1SecureScoreGetAllNode
	| MicrosoftGraphSecurityV1SecureScoreControlProfileGetNode
	| MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllNode
	| MicrosoftGraphSecurityV1SecureScoreControlProfileUpdateNode
	;
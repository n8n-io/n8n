/**
 * Microsoft Graph Security Node Types
 *
 * Consume the Microsoft Graph Security API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftgraphsecurity/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MicrosoftGraphSecurityV1SecureScoreGetConfig = {
	resource: 'secureScore';
	operation: 'get';
	/**
	 * ID of the secure score to retrieve
	 */
	secureScoreId: string | Expression<string>;
};

export type MicrosoftGraphSecurityV1SecureScoreGetAllConfig = {
	resource: 'secureScore';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	secureScoreControlProfileId: string | Expression<string>;
};

export type MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllConfig = {
	resource: 'secureScoreControlProfile';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	secureScoreControlProfileId: string | Expression<string>;
	/**
	 * Name of the provider of the security product or service
	 */
	provider: string | Expression<string>;
	/**
	 * Name of the vendor of the security product or service
	 */
	vendor: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftGraphSecurityV1Params =
	| MicrosoftGraphSecurityV1SecureScoreGetConfig
	| MicrosoftGraphSecurityV1SecureScoreGetAllConfig
	| MicrosoftGraphSecurityV1SecureScoreControlProfileGetConfig
	| MicrosoftGraphSecurityV1SecureScoreControlProfileGetAllConfig
	| MicrosoftGraphSecurityV1SecureScoreControlProfileUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftGraphSecurityV1Credentials {
	microsoftGraphSecurityOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftGraphSecurityNode = {
	type: 'n8n-nodes-base.microsoftGraphSecurity';
	version: 1;
	config: NodeConfig<MicrosoftGraphSecurityV1Params>;
	credentials?: MicrosoftGraphSecurityV1Credentials;
};

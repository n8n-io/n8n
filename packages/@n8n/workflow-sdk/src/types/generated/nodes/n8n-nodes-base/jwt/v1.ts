/**
 * JWT Node - Version 1
 * JWT
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface JwtV1Params {
	operation?: 'decode' | 'sign' | 'verify' | Expression<string>;
/**
 * Whether to use JSON to build the claims
 * @displayOptions.show { operation: ["sign"] }
 * @default false
 */
		useJson?: boolean | Expression<boolean>;
	claims?: Record<string, unknown>;
/**
 * Claims to add to the token in JSON format
 * @displayOptions.show { operation: ["sign"], useJson: [true] }
 * @default {
  "my_field_1": "value 1",
  "my_field_2": "value 2"
}

 */
		claimsJson?: IDataObject | string | Expression<string>;
/**
 * The token to verify or decode
 * @displayOptions.show { operation: ["verify", "decode"] }
 */
		token: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface JwtV1Credentials {
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type JwtV1Node = {
	type: 'n8n-nodes-base.jwt';
	version: 1;
	config: NodeConfig<JwtV1Params>;
	credentials?: JwtV1Credentials;
};
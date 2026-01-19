/**
 * JWT Node - Version 1
 * JWT
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface JwtV1Config {
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
// Node Types
// ===========================================================================

interface JwtV1NodeBase {
	type: 'n8n-nodes-base.jwt';
	version: 1;
	credentials?: JwtV1Credentials;
}

export type JwtV1Node = JwtV1NodeBase & {
	config: NodeConfig<JwtV1Config>;
};

export type JwtV1Node = JwtV1Node;
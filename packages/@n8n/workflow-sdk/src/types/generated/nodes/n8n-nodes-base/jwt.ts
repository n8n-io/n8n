/**
 * JWT Node Types
 *
 * JWT
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/jwt/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface JwtV1Params {
	operation?: 'decode' | 'sign' | 'verify' | Expression<string>;
	/**
	 * Whether to use JSON to build the claims
	 * @default false
	 */
	useJson?: boolean | Expression<boolean>;
	claims?: Record<string, unknown>;
	/**
 * Claims to add to the token in JSON format
 * @default {
  "my_field_1": "value 1",
  "my_field_2": "value 2"
}

 */
	claimsJson?: IDataObject | string | Expression<string>;
	/**
	 * The token to verify or decode
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

export type JwtNode = {
	type: 'n8n-nodes-base.jwt';
	version: 1;
	config: NodeConfig<JwtV1Params>;
	credentials?: JwtV1Credentials;
};

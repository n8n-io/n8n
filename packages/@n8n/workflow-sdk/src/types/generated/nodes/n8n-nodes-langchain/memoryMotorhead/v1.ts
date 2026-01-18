/**
 * Motorhead Node - Version 1
 * Use Motorhead Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV1Params {
	sessionId: string | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV1Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryMotorheadV1Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1;
	config: NodeConfig<LcMemoryMotorheadV1Params>;
	credentials?: LcMemoryMotorheadV1Credentials;
	isTrigger: true;
};
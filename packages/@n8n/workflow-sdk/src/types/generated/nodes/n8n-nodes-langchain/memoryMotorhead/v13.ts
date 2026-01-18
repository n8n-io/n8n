/**
 * Motorhead Node - Version 1.3
 * Use Motorhead Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV13Params {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV13Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryMotorheadV13Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.3;
	config: NodeConfig<LcMemoryMotorheadV13Params>;
	credentials?: LcMemoryMotorheadV13Credentials;
	isTrigger: true;
};
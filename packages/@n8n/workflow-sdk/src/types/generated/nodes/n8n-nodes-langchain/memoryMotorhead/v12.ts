/**
 * Motorhead Node - Version 1.2
 * Use Motorhead Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV12Params {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV12Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryMotorheadV12Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.2;
	config: NodeConfig<LcMemoryMotorheadV12Params>;
	credentials?: LcMemoryMotorheadV12Credentials;
	isTrigger: true;
};
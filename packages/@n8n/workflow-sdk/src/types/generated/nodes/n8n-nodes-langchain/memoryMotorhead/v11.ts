/**
 * Motorhead Node - Version 1.1
 * Use Motorhead Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMotorheadV11Params {
/**
 * The key to use to store the memory
 * @default ={{ $json.sessionId }}
 */
		sessionId?: string | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMotorheadV11Credentials {
	motorheadApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryMotorheadV11Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMotorhead';
	version: 1.1;
	config: NodeConfig<LcMemoryMotorheadV11Params>;
	credentials?: LcMemoryMotorheadV11Credentials;
	isTrigger: true;
};
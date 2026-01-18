/**
 * No Operation, do nothing Node - Version 1
 * No Operation
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface NoOpV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type NoOpV1Node = {
	type: 'n8n-nodes-base.noOp';
	version: 1;
	config: NodeConfig<NoOpV1Params>;
	credentials?: Record<string, never>;
};
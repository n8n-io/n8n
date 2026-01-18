/**
 * Error Trigger Node - Version 1
 * Triggers the workflow when another workflow has an error
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ErrorTriggerV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ErrorTriggerV1Node = {
	type: 'n8n-nodes-base.errorTrigger';
	version: 1;
	config: NodeConfig<ErrorTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
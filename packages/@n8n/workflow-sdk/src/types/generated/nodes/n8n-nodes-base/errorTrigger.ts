/**
 * Error Trigger Node Types
 *
 * Triggers the workflow when another workflow has an error
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/errortrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ErrorTriggerV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ErrorTriggerV1Node = {
	type: 'n8n-nodes-base.errorTrigger';
	version: 1;
	config: NodeConfig<ErrorTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type ErrorTriggerNode = ErrorTriggerV1Node;

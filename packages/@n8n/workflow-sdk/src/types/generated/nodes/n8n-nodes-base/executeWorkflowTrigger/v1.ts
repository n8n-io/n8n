/**
 * Execute Workflow Trigger Node - Version 1
 * Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowTriggerV1Params {
	events?: unknown;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ExecuteWorkflowTriggerV1Node = {
	type: 'n8n-nodes-base.executeWorkflowTrigger';
	version: 1;
	config: NodeConfig<ExecuteWorkflowTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
/**
 * Execute Workflow Trigger Node - Version 1.1
 * Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowTriggerV11Params {
	events?: unknown;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ExecuteWorkflowTriggerV11Node = {
	type: 'n8n-nodes-base.executeWorkflowTrigger';
	version: 1.1;
	config: NodeConfig<ExecuteWorkflowTriggerV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
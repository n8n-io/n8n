/**
 * Execute Workflow Trigger Node Types
 *
 * Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/executeworkflowtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowTriggerV11Params {
	events?: unknown;
	inputSource?: 'workflowInputs' | 'jsonExample' | 'passthrough' | Expression<string>;
	jsonExample?: IDataObject | string | Expression<string>;
	/**
	 * Define expected input fields. If no inputs are provided, all data from the calling workflow will be passed through.
	 * @default {}
	 */
	workflowInputs?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ExecuteWorkflowTriggerV11Node = {
	type: 'n8n-nodes-base.executeWorkflowTrigger';
	version: 1 | 1.1;
	config: NodeConfig<ExecuteWorkflowTriggerV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type ExecuteWorkflowTriggerNode = ExecuteWorkflowTriggerV11Node;

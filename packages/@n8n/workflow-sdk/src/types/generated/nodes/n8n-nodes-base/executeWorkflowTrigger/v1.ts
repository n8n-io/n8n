/**
 * Execute Workflow Trigger Node - Version 1
 * Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowTriggerV1Config {
	events?: unknown;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ExecuteWorkflowTriggerV1NodeBase {
	type: 'n8n-nodes-base.executeWorkflowTrigger';
	version: 1;
	isTrigger: true;
}

export type ExecuteWorkflowTriggerV1Node = ExecuteWorkflowTriggerV1NodeBase & {
	config: NodeConfig<ExecuteWorkflowTriggerV1Config>;
};

export type ExecuteWorkflowTriggerV1Node = ExecuteWorkflowTriggerV1Node;
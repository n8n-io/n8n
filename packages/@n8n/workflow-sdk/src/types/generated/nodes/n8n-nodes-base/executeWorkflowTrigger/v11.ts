/**
 * Execute Workflow Trigger Node - Version 1.1
 * Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowTriggerV11Config {
	events?: unknown;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ExecuteWorkflowTriggerV11NodeBase {
	type: 'n8n-nodes-base.executeWorkflowTrigger';
	version: 1.1;
	isTrigger: true;
}

export type ExecuteWorkflowTriggerV11Node = ExecuteWorkflowTriggerV11NodeBase & {
	config: NodeConfig<ExecuteWorkflowTriggerV11Config>;
};

export type ExecuteWorkflowTriggerV11Node = ExecuteWorkflowTriggerV11Node;
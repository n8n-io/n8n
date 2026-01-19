/**
 * Workable Trigger Node - Version 1
 * Starts the workflow when Workable events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WorkableTriggerV1Config {
	triggerOn: 'candidateCreated' | 'candidateMoved' | Expression<string>;
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WorkableTriggerV1Credentials {
	workableApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WorkableTriggerV1NodeBase {
	type: 'n8n-nodes-base.workableTrigger';
	version: 1;
	credentials?: WorkableTriggerV1Credentials;
	isTrigger: true;
}

export type WorkableTriggerV1Node = WorkableTriggerV1NodeBase & {
	config: NodeConfig<WorkableTriggerV1Config>;
};

export type WorkableTriggerV1Node = WorkableTriggerV1Node;
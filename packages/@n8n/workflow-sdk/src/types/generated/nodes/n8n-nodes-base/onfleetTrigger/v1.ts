/**
 * Onfleet Trigger Node - Version 1
 * Starts the workflow when Onfleet events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OnfleetTriggerV1Params {
	triggerOn: 'SMSRecipientOptOut' | 'smsRecipientResponseMissed' | 'taskArrival' | 'taskAssigned' | 'taskCloned' | 'taskCompleted' | 'taskCreated' | 'taskDelayed' | 'taskDeleted' | 'taskEta' | 'taskFailed' | 'taskStarted' | 'taskUnassigned' | 'taskUpdated' | 'workerCreated' | 'workerDeleted' | 'workerDuty' | Expression<string>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface OnfleetTriggerV1Credentials {
	onfleetApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OnfleetTriggerV1NodeBase {
	type: 'n8n-nodes-base.onfleetTrigger';
	version: 1;
	credentials?: OnfleetTriggerV1Credentials;
	isTrigger: true;
}

export type OnfleetTriggerV1ParamsNode = OnfleetTriggerV1NodeBase & {
	config: NodeConfig<OnfleetTriggerV1Params>;
};

export type OnfleetTriggerV1Node = OnfleetTriggerV1ParamsNode;
import type { IWorkflowBase } from 'n8n-workflow';

/*
 * The only file that knows the `@n8n/workflow-engine-check` contract. The package is private,
 * and a published module can't depend on it at run time, so this file holds a copy of its
 * types and a stub check. To use the package, delete the copy and the stub, and import both.
 */

export type EngineV2EligibilityWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections' | 'settings'>;

/** Stable identifiers. Consumers key messages and metrics on them, so never rename one. */
export type EngineV2ReasonCode =
	| 'ERROR_WORKFLOW'
	| 'REDACTION_POLICY'
	| 'END_USER_CREDENTIALS'
	| 'TRIGGER_EXTERNAL_IDENTITY';

export interface EngineV2Reason {
	code: EngineV2ReasonCode;
	severity: 'blocking' | 'warning';
	nodeId?: string;
	nodeName?: string;
	/** English fallback text. */
	message: string;
}

export interface EngineV2Eligibility {
	eligible: boolean;
	reasons: EngineV2Reason[];
}

function checkEngineV2Eligibility(_workflow: EngineV2EligibilityWorkflow): EngineV2Eligibility {
	return { eligible: true, reasons: [] };
}

export type EngineCompatibilityWorkflow = EngineV2EligibilityWorkflow;
export type EngineCompatibilityReason = EngineV2Reason;
export type EngineCompatibility = EngineV2Eligibility;

/**
 * The module calls the check through this object, so that tests can replace a method with
 * `mockEngineV2Compatibility` from `./__tests__/mocks`.
 */
export const engineV2Check = {
	checkWorkflow(workflow: EngineCompatibilityWorkflow): EngineCompatibility {
		return checkEngineV2Eligibility(workflow);
	},

	/** The package cannot answer per node type yet (CET-676), so every type is supported. */
	isNodeTypeSupported(_nodeTypeName: string): boolean {
		return true;
	},
};

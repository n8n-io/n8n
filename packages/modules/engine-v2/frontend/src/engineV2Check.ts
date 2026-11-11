import type { IWorkflowBase } from 'n8n-workflow';

/*
 * The only file that knows the `@n8n/workflow-engine-check` contract. The package is not on
 * `master` yet, so this file holds a copy of its types and a stub check. When the package
 * lands, delete the copy and the stub, and import both from the package.
 */

export type EngineV2EligibilityWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections' | 'settings'>;

/** Stable identifiers. Consumers key messages and metrics on them, so never rename one. */
export type EngineV2ReasonCode =
	| 'error-workflow'
	| 'redaction-policy'
	| 'end-user-credentials'
	| 'trigger-external-identity';

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

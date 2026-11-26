import {
	checkEngineV2Eligibility,
	isNodeTypeSupported,
	type EngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2Reason,
	type EngineV2ReasonCode,
	type EngineV2ReasonKind,
} from '@n8n/workflow-engine-check';

/*
 * The only file that imports `@n8n/workflow-engine-check`. The rest of the module uses the
 * names below, so a change to the package contract changes this file only.
 */

export type EngineCompatibilityWorkflow = EngineV2EligibilityWorkflow;
export type EngineCompatibilityReason = EngineV2Reason;
export type EngineCompatibility = EngineV2Eligibility;
export type EngineCompatibilityReasonCode = EngineV2ReasonCode;
export type EngineCompatibilityReasonKind = EngineV2ReasonKind;

/**
 * The module calls the check through this object, so that tests can replace a method with
 * `mockEngineV2Compatibility` from `./__tests__/mocks`.
 */
export const engineV2Check = {
	checkWorkflow(workflow: EngineCompatibilityWorkflow): EngineCompatibility {
		return checkEngineV2Eligibility(workflow);
	},

	isNodeTypeSupported(nodeTypeName: string): boolean {
		return isNodeTypeSupported(nodeTypeName);
	},
};

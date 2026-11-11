import type { INodeTypeDescription } from 'n8n-workflow';

import { findSettingsReasons } from './settings-rules';
import { findTriggerIdentityReasons } from './trigger-identity-rule';
import type { EngineV2Eligibility, EngineV2EligibilityWorkflow } from './types';

/**
 * Reports whether engine v2 can run the workflow, and every reason it cannot.
 *
 * An approximation: a workflow it reports as eligible can still fail at run time.
 * Each rule must never refuse a workflow that engine v2 runs.
 *
 * No rule reads `nodeTypes` yet. The node type rules (CET-676) will.
 */
export function checkEngineV2Eligibility(
	workflow: EngineV2EligibilityWorkflow,
	_nodeTypes: readonly INodeTypeDescription[],
): EngineV2Eligibility {
	const reasons = [
		...findSettingsReasons(workflow.settings ?? {}),
		...findTriggerIdentityReasons(workflow.nodes),
	];
	return { eligible: reasons.every((reason) => reason.severity !== 'blocking'), reasons };
}

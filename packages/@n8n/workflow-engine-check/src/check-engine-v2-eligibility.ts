import { findConverterReasons } from './converter-rules';
import { findGraphReasons } from './graph-rules';
import { findNodeTypeReasons } from './node-type-rule';
import { rootWorkflow } from './reachable-nodes';
import { findSettingsReasons } from './settings-rules';
import { findTriggerIdentityReasons } from './trigger-identity-rule';
import type { EngineV2Eligibility, EngineV2EligibilityWorkflow } from './types';

/**
 * Reports whether engine v2 can run the workflow, and every reason it cannot.
 *
 * An approximation: a workflow it reports as eligible can still fail at run time.
 * Each rule must never refuse a workflow that engine v2 runs, so every rule sees only
 * the nodes that engine v2 runs.
 */
export function checkEngineV2Eligibility(
	workflow: EngineV2EligibilityWorkflow,
): EngineV2Eligibility {
	const rooted = rootWorkflow(workflow);
	const reasons = [
		...findSettingsReasons(rooted.settings ?? {}),
		...findTriggerIdentityReasons(rooted.nodes),
		...findNodeTypeReasons(rooted.nodes),
		...findConverterReasons(rooted.nodes, rooted.connections),
		...findGraphReasons(rooted.nodes, rooted.connections),
	];
	return { eligible: reasons.every((reason) => reason.severity !== 'blocking'), reasons };
}

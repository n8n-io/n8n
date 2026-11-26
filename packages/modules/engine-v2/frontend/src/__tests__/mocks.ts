import { vi } from 'vitest';

import {
	engineV2Check,
	type EngineCompatibilityReason,
	type EngineCompatibilityWorkflow,
} from '../engineV2Check';

/**
 * Makes the engine v2 check return these results until the test ends. `reasons` can be a
 * function of the checked workflow, to prove that a change to the workflow reaches the check.
 */
export function mockEngineV2Compatibility({
	reasons = [],
	unsupportedNodeTypes = [],
}: {
	reasons?:
		| EngineCompatibilityReason[]
		| ((workflow: EngineCompatibilityWorkflow) => EngineCompatibilityReason[]);
	unsupportedNodeTypes?: string[];
} = {}) {
	const checkWorkflow = vi.spyOn(engineV2Check, 'checkWorkflow').mockImplementation((workflow) => {
		const result = typeof reasons === 'function' ? reasons(workflow) : reasons;
		return {
			eligible: !result.some((reason) => reason.severity === 'blocking'),
			reasons: result,
		};
	});
	const isNodeTypeSupported = vi
		.spyOn(engineV2Check, 'isNodeTypeSupported')
		.mockImplementation((nodeTypeName) => !unsupportedNodeTypes.includes(nodeTypeName));

	return { checkWorkflow, isNodeTypeSupported };
}

import type * as Package from '@n8n/workflow-engine-check';

import {
	engineV2Check,
	type EngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2Reason,
	type EngineV2ReasonCode,
} from './engineV2Check';

describe('engineV2Check', () => {
	it('stub reports eligible with no reasons', () => {
		expect(engineV2Check.checkWorkflow({ nodes: [], connections: {}, settings: {} })).toEqual({
			eligible: true,
			reasons: [],
		});
	});

	it('stub reports every node type as supported', () => {
		expect(engineV2Check.isNodeTypeSupported('n8n-nodes-base.webhook')).toBe(true);
		expect(engineV2Check.isNodeTypeSupported('')).toBe(true);
	});

	// The typecheck fails when the package changes its contract and this copy doesn't follow.
	it('copies the contract of the package exactly', () => {
		expectTypeOf<EngineV2ReasonCode>().toEqualTypeOf<Package.EngineV2ReasonCode>();
		expectTypeOf<EngineV2Reason>().toEqualTypeOf<Package.EngineV2Reason>();
		expectTypeOf<EngineV2Eligibility>().toEqualTypeOf<Package.EngineV2Eligibility>();
		expectTypeOf<EngineV2EligibilityWorkflow>().toEqualTypeOf<Package.EngineV2EligibilityWorkflow>();
	});
});

import { engineV2Check } from './engineV2Check';

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
});

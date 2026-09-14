import type { NodeTypeAvailability } from '@n8n/api-types';

import { useTypeAvailabilityPoliciesStore } from './type-availability-policies.store';

const mocks = vi.hoisted(() => ({ isModuleActive: vi.fn<(id: string) => boolean>() }));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isModuleActive: mocks.isModuleActive }),
}));

const SLACK = 'n8n-nodes-base.slack';

const denied: NodeTypeAvailability = {
	name: SLACK,
	available: false,
	scope: 'instance',
	matchedRuleId: 'rule-1',
};

describe('useTypeAvailabilityPoliciesStore', () => {
	beforeEach(() => {
		mocks.isModuleActive.mockReset();
		mocks.isModuleActive.mockReturnValue(true);
	});

	it('reports every node type as available while the module is inactive', () => {
		mocks.isModuleActive.mockReturnValue(false);

		const store = useTypeAvailabilityPoliciesStore();
		store.setNodeTypeAvailability('project-1', [denied]);

		// An unlicensed or disabled instance must look exactly like one with no policies.
		// Any other default hides nodes from every user of every instance.
		expect(store.isEnabled).toBe(false);
		expect(store.isNodeTypeAvailable(SLACK)).toBe(true);
		expect(store.getNodeTypeAvailability(SLACK)).toEqual({ name: SLACK, available: true });
	});

	it('reports an uncached node type as available while the module is active', () => {
		const store = useTypeAvailabilityPoliciesStore();

		expect(store.isNodeTypeAvailable(SLACK)).toBe(true);
	});

	it('reports a cached denial with its scope and rule', () => {
		const store = useTypeAvailabilityPoliciesStore();
		store.setNodeTypeAvailability('project-1', [denied]);

		expect(store.cachedProjectId).toBe('project-1');
		expect(store.isNodeTypeAvailable(SLACK)).toBe(false);
		expect(store.getNodeTypeAvailability(SLACK)).toEqual(denied);
	});

	it('returns to "everything available" after a reset', () => {
		const store = useTypeAvailabilityPoliciesStore();
		store.setNodeTypeAvailability('project-1', [denied]);

		store.reset();

		expect(store.cachedProjectId).toBeNull();
		expect(store.isNodeTypeAvailable(SLACK)).toBe(true);
	});
});

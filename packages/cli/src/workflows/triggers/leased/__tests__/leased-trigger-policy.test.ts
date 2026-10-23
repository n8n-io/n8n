import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { ClusterLeases } from '@/scheduling/leases/cluster-leases';

import { createNodeTypes, node } from '../../__tests__/trigger-test-utils';
import { LeasedTriggerPolicy } from '../leased-trigger-policy';

const policy = (nodeTypes: string, leasesAvailable = true) =>
	new LeasedTriggerPolicy(
		mock<GlobalConfig>({ workflows: { leasedTriggerNodeTypes: nodeTypes } }),
		mock<ClusterLeases>({ isAvailable: () => leasesAvailable }),
		createNodeTypes(),
	);

describe('LeasedTriggerPolicy', () => {
	it('leases the listed trigger node types', () => {
		const leased = policy(' trigger , manual,');

		expect(leased.isEnabled()).toBe(true);
		expect(leased.isLeased(node('a', 'trigger'))).toBe(true);
		expect(leased.isLeased(node('b', 'manual'))).toBe(true);
		expect(leased.isLeased(node('c', 'execute-workflow'))).toBe(false);
	});

	it('does not lease a listed poll node type', () => {
		expect(policy('poll').isLeased(node('a', 'poll'))).toBe(false);
	});

	it('does not lease a listed node type that is not installed', () => {
		expect(policy('unrecognized').isLeased(node('a', 'unrecognized'))).toBe(false);
	});

	it('leases nothing when no node type is listed', () => {
		expect(policy('').isEnabled()).toBe(false);
	});

	it('leases nothing when cluster leases are unavailable', () => {
		const leased = policy('trigger', false);

		expect(leased.isEnabled()).toBe(false);
		expect(leased.isLeased(node('a', 'trigger'))).toBe(false);
	});

	it('keeps only the nodes the leader activates', () => {
		const nodes = [node('a', 'trigger'), node('b', 'poll')];

		expect(policy('trigger,poll').withoutLeased(nodes)).toEqual([node('b', 'poll')]);
	});
});

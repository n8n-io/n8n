import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { ClusterLeases } from '@/scheduling/leases/cluster-leases';

import { LeasedTriggerPolicy } from '../leased-trigger-policy';

const policy = (nodeTypes: string, leasesAvailable = true) =>
	new LeasedTriggerPolicy(
		mock<GlobalConfig>({ workflows: { leasedTriggerNodeTypes: nodeTypes } }),
		mock<ClusterLeases>({ isAvailable: () => leasesAvailable }),
	);

describe('LeasedTriggerPolicy', () => {
	it('leases the listed node types', () => {
		const leased = policy(' n8n-nodes-base.kafkaTrigger , n8n-nodes-base.mqttTrigger,');

		expect(leased.isEnabled()).toBe(true);
		expect(leased.isLeased({ type: 'n8n-nodes-base.kafkaTrigger' })).toBe(true);
		expect(leased.isLeased({ type: 'n8n-nodes-base.mqttTrigger' })).toBe(true);
		expect(leased.isLeased({ type: 'n8n-nodes-base.rabbitmqTrigger' })).toBe(false);
	});

	it('leases nothing when no node type is listed', () => {
		expect(policy('').isEnabled()).toBe(false);
	});

	it('leases nothing when cluster leases are unavailable', () => {
		const leased = policy('n8n-nodes-base.kafkaTrigger', false);

		expect(leased.isEnabled()).toBe(false);
		expect(leased.isLeased({ type: 'n8n-nodes-base.kafkaTrigger' })).toBe(false);
	});

	it('keeps only the nodes the leader activates', () => {
		const nodes = [{ type: 'n8n-nodes-base.kafkaTrigger' }, { type: 'n8n-nodes-base.webhook' }];

		expect(policy('n8n-nodes-base.kafkaTrigger').withoutLeased(nodes)).toEqual([
			{ type: 'n8n-nodes-base.webhook' },
		]);
	});
});

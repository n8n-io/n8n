import type { InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext } from '@n8n/decorators';

import { HostIdClashCheck } from '../../checks/hostid-clash.check';

const makeInstance = (override: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1 as const,
	instanceKey: 'key',
	hostId: 'host',
	instanceType: 'main',
	instanceRole: 'follower',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	...override,
});

const inst = (instanceKey: string, hostId: string): InstanceRegistration =>
	makeInstance({ instanceKey, hostId });

const makeContext = (
	current: InstanceRegistration[],
	previous: InstanceRegistration[] = [],
): ClusterCheckContext => ({
	currentState: new Map(current.map((i) => [i.instanceKey, i])),
	previousState: new Map(previous.map((i) => [i.instanceKey, i])),
	diff: { added: [], removed: [], changed: [] },
});

describe('HostIdClashCheck', () => {
	const check = new HostIdClashCheck();

	it('has a stable name and displayName', () => {
		expect(check.checkDescription).toEqual({
			name: 'hostid-clash',
			displayName: 'Host ID clash',
		});
	});

	describe('state transitions', () => {
		type Scenario = {
			name: string;
			previous: InstanceRegistration[];
			current: InstanceRegistration[];
			expectWarning: boolean;
			expectAudit: 'detected' | 'resolved' | 'none';
		};

		const scenarios: Scenario[] = [
			{
				name: 'unique hostIds: no warning or events',
				previous: [inst('a', 'host-1'), inst('b', 'host-2')],
				current: [inst('a', 'host-1'), inst('b', 'host-2')],
				expectWarning: false,
				expectAudit: 'none',
			},
			{
				name: 'newly detected clash: warning + detected audit',
				previous: [],
				current: [inst('a', 'shared'), inst('b', 'shared'), inst('c', 'unique')],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'clash with changed set of hostIds: fresh audit',
				previous: [inst('a', 'host-a'), inst('b', 'host-a')],
				current: [
					inst('a', 'host-a'),
					inst('b', 'host-a'),
					inst('c', 'host-b'),
					inst('d', 'host-b'),
				],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'ongoing identical clash: warning only, no audit (deduplicated)',
				previous: [inst('a', 'shared'), inst('b', 'shared')],
				current: [inst('a', 'shared'), inst('b', 'shared')],
				expectWarning: true,
				expectAudit: 'none',
			},
			{
				name: 'clash persists under same host with different instance keys: still deduplicated',
				previous: [inst('a', 'shared'), inst('b', 'shared')],
				current: [inst('c', 'shared'), inst('d', 'shared')],
				expectWarning: true,
				expectAudit: 'none',
			},
			{
				name: 'clash resolved: resolved audit, no warning',
				previous: [inst('a', 'shared'), inst('b', 'shared')],
				current: [inst('a', 'host-a'), inst('b', 'host-b')],
				expectWarning: false,
				expectAudit: 'resolved',
			},
		];

		it.each(scenarios)('$name', async (s) => {
			const result = await check.run(makeContext(s.current, s.previous));

			if (s.expectWarning) {
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings?.[0].code).toBe('cluster.hostid-clash');
				expect(result.warnings?.[0].severity).toBe('warning');
			} else {
				expect(result.warnings).toBeUndefined();
			}

			if (s.expectAudit === 'detected') {
				expect(result.auditEvents).toEqual([
					expect.objectContaining({ eventName: 'n8n.audit.cluster.hostid-clash.detected' }),
				]);
			} else if (s.expectAudit === 'resolved') {
				expect(result.auditEvents).toEqual([
					{ eventName: 'n8n.audit.cluster.hostid-clash.resolved', payload: {} },
				]);
			} else {
				expect(result.auditEvents).toBeUndefined();
			}

			expect(result.pushNotifications).toBeUndefined();
		});
	});

	it('reports all clashing hostIds in a deterministic order', async () => {
		const current = [
			inst('a', 'host-b'),
			inst('b', 'host-b'),
			inst('c', 'host-a'),
			inst('d', 'host-a'),
		];

		const result = await check.run(makeContext(current));

		expect(result.warnings?.[0].message).toBe(
			'Detected multiple instances sharing the same hostId: host-a, host-b',
		);
		expect(result.warnings?.[0].context).toEqual({
			clashing: [
				{ hostId: 'host-a', instanceKeys: ['c', 'd'] },
				{ hostId: 'host-b', instanceKeys: ['a', 'b'] },
			],
		});
	});
});

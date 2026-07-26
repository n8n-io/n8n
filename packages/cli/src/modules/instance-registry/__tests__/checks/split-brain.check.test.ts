import type { InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext } from '@n8n/decorators';

import { SplitBrainCheck } from '../../checks/split-brain.check';

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

const inst = (
	instanceKey: string,
	role: InstanceRegistration['instanceRole'],
): InstanceRegistration => makeInstance({ instanceKey, instanceRole: role });

const makeContext = (
	current: InstanceRegistration[],
	previous: InstanceRegistration[] = [],
): ClusterCheckContext => ({
	currentState: new Map(current.map((i) => [i.instanceKey, i])),
	previousState: new Map(previous.map((i) => [i.instanceKey, i])),
	diff: { added: [], removed: [], changed: [] },
});

describe('SplitBrainCheck', () => {
	const check = new SplitBrainCheck();

	it('has a stable name and displayName', () => {
		expect(check.checkDescription).toEqual({
			name: 'split-brain',
			displayName: 'Split-brain',
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
				name: 'single leader cluster: no warning or events',
				previous: [inst('a', 'leader'), inst('b', 'follower')],
				current: [inst('a', 'leader'), inst('b', 'follower')],
				expectWarning: false,
				expectAudit: 'none',
			},
			{
				name: 'leaderless cluster (e.g. transition): no warning or events',
				previous: [inst('a', 'follower'), inst('b', 'follower')],
				current: [inst('a', 'follower'), inst('b', 'follower')],
				expectWarning: false,
				expectAudit: 'none',
			},
			{
				name: 'newly detected split-brain: error warning + detected audit',
				previous: [],
				current: [inst('a', 'leader'), inst('b', 'leader')],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'split-brain with changed leader set: fresh audit',
				previous: [inst('a', 'leader'), inst('b', 'leader')],
				current: [inst('a', 'leader'), inst('c', 'leader')],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'ongoing identical split-brain: warning only, no audit (deduplicated)',
				previous: [inst('a', 'leader'), inst('b', 'leader')],
				current: [inst('a', 'leader'), inst('b', 'leader')],
				expectWarning: true,
				expectAudit: 'none',
			},
			{
				name: 'split-brain resolved: resolved audit, no warning',
				previous: [inst('a', 'leader'), inst('b', 'leader')],
				current: [inst('a', 'leader'), inst('b', 'follower')],
				expectWarning: false,
				expectAudit: 'resolved',
			},
		];

		it.each(scenarios)('$name', async (s) => {
			const result = await check.run(makeContext(s.current, s.previous));

			if (s.expectWarning) {
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings?.[0].code).toBe('cluster.split-brain');
				expect(result.warnings?.[0].severity).toBe('error');
			} else {
				expect(result.warnings).toBeUndefined();
			}

			if (s.expectAudit === 'detected') {
				expect(result.auditEvents).toEqual([
					expect.objectContaining({ eventName: 'n8n.audit.cluster.split-brain.detected' }),
				]);
			} else if (s.expectAudit === 'resolved') {
				expect(result.auditEvents).toEqual([
					{ eventName: 'n8n.audit.cluster.split-brain.resolved', payload: {} },
				]);
			} else {
				expect(result.auditEvents).toBeUndefined();
			}

			expect(result.pushNotifications).toBeUndefined();
		});
	});

	it('reports all leaders (sorted by instanceKey) in warning context and audit payload', async () => {
		const current = [inst('z', 'leader'), inst('a', 'leader'), inst('m', 'follower')];

		const result = await check.run(makeContext(current));

		expect(result.warnings?.[0].message).toBe('Detected 2 instances claiming leader role: a, z');
		expect(result.auditEvents?.[0].payload).toEqual({
			leaders: [
				{ instanceKey: 'a', hostId: 'host', instanceType: 'main' },
				{ instanceKey: 'z', hostId: 'host', instanceType: 'main' },
			],
		});
	});
});

import type { InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext, ClusterStateDiff } from '@n8n/decorators';

import { LifecycleCheck } from '../../checks/lifecycle.check';

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

const makeContext = (diff: Partial<ClusterStateDiff>): ClusterCheckContext => ({
	currentState: new Map(),
	previousState: new Map(),
	diff: {
		added: diff.added ?? [],
		removed: diff.removed ?? [],
		changed: diff.changed ?? [],
	},
});

describe('LifecycleCheck', () => {
	const check = new LifecycleCheck();

	it('has a stable name and displayName', () => {
		expect(check.checkDescription).toEqual({
			name: 'lifecycle',
			displayName: 'Cluster membership',
		});
	});

	type Scenario = {
		name: string;
		diff: Partial<ClusterStateDiff>;
		expectedEvents: string[];
	};

	const scenarios: Scenario[] = [
		{
			name: 'no membership changes: empty result',
			diff: {},
			expectedEvents: [],
		},
		{
			name: 'one joined audit event per added instance',
			diff: {
				added: [makeInstance({ instanceKey: 'a' }), makeInstance({ instanceKey: 'b' })],
			},
			expectedEvents: ['n8n.audit.cluster.instance-joined', 'n8n.audit.cluster.instance-joined'],
		},
		{
			name: 'one left audit event per removed instance',
			diff: { removed: [makeInstance({ instanceKey: 'c' })] },
			expectedEvents: ['n8n.audit.cluster.instance-left'],
		},
		{
			name: 'joined and left together in the same cycle',
			diff: {
				added: [makeInstance({ instanceKey: 'a' })],
				removed: [makeInstance({ instanceKey: 'b' })],
			},
			expectedEvents: ['n8n.audit.cluster.instance-joined', 'n8n.audit.cluster.instance-left'],
		},
		{
			name: 'ignores the `changed` bucket (other checks cover role/version mutations)',
			diff: {
				changed: [
					{
						previous: makeInstance({ instanceKey: 'a', version: '1.0.0' }),
						current: makeInstance({ instanceKey: 'a', version: '1.1.0' }),
					},
				],
			},
			expectedEvents: [],
		},
	];

	it.each(scenarios)('$name', async (s) => {
		const result = await check.run(makeContext(s.diff));

		expect(result.warnings).toBeUndefined();
		expect(result.pushNotifications).toBeUndefined();

		if (s.expectedEvents.length === 0) {
			expect(result.auditEvents).toBeUndefined();
			return;
		}
		expect(result.auditEvents?.map((e) => e.eventName)).toEqual(s.expectedEvents);
	});

	it('includes membership details in the audit payload', async () => {
		const joined = makeInstance({
			instanceKey: 'a',
			hostId: 'host-1',
			instanceType: 'worker',
			instanceRole: 'follower',
			version: '1.2.0',
		});

		const result = await check.run(makeContext({ added: [joined] }));

		expect(result.auditEvents?.[0].payload).toEqual({
			instanceKey: 'a',
			hostId: 'host-1',
			instanceType: 'worker',
			instanceRole: 'follower',
			version: '1.2.0',
		});
	});
});

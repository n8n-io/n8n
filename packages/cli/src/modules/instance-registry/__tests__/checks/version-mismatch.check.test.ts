import type { InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext } from '@n8n/decorators';

import { VersionMismatchCheck } from '../../checks/version-mismatch.check';

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

const versions = (...vs: string[]): InstanceRegistration[] =>
	vs.map((v, i) => makeInstance({ instanceKey: `k${i}`, version: v }));

const makeContext = (
	current: InstanceRegistration[],
	previous: InstanceRegistration[] = [],
): ClusterCheckContext => ({
	currentState: new Map(current.map((i) => [i.instanceKey, i])),
	previousState: new Map(previous.map((i) => [i.instanceKey, i])),
	diff: { added: [], removed: [], changed: [] },
});

describe('VersionMismatchCheck', () => {
	const check = new VersionMismatchCheck();

	it('has a stable name and displayName', () => {
		expect(check.checkDescription).toEqual({
			name: 'version-mismatch',
			displayName: 'Version mismatch',
		});
	});

	describe('state transitions', () => {
		type Scenario = {
			name: string;
			previous: string[];
			current: string[];
			expectWarning: boolean;
			expectAudit: 'detected' | 'resolved' | 'none';
		};

		const scenarios: Scenario[] = [
			{
				name: 'single version cluster: no warning or events',
				previous: ['1.0.0'],
				current: ['1.0.0'],
				expectWarning: false,
				expectAudit: 'none',
			},
			{
				name: 'newly detected mismatch: warning + detected audit',
				previous: [],
				current: ['1.0.0', '1.1.0'],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'mismatch with changed version set: fresh audit',
				previous: ['1.0.0', '1.1.0'],
				current: ['1.0.0', '1.2.0'],
				expectWarning: true,
				expectAudit: 'detected',
			},
			{
				name: 'ongoing identical mismatch: warning only, no audit (deduplicated)',
				previous: ['1.0.0', '1.1.0'],
				current: ['1.0.0', '1.1.0'],
				expectWarning: true,
				expectAudit: 'none',
			},
			{
				name: 'mismatch resolved: resolved audit, no warning',
				previous: ['1.0.0', '1.1.0'],
				current: ['1.1.0', '1.1.0'],
				expectWarning: false,
				expectAudit: 'resolved',
			},
			{
				name: 'still resolved on next cycle: nothing emitted',
				previous: ['1.1.0', '1.1.0'],
				current: ['1.1.0', '1.1.0'],
				expectWarning: false,
				expectAudit: 'none',
			},
		];

		it.each(scenarios)('$name', async (s) => {
			const result = await check.run(makeContext(versions(...s.current), versions(...s.previous)));

			if (s.expectWarning) {
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings?.[0].code).toBe('cluster.version-mismatch');
				expect(result.warnings?.[0].severity).toBe('error');
			} else {
				expect(result.warnings).toBeUndefined();
			}

			if (s.expectAudit === 'detected') {
				expect(result.auditEvents).toEqual([
					expect.objectContaining({
						eventName: 'n8n.audit.cluster.version-mismatch.detected',
					}),
				]);
			} else if (s.expectAudit === 'resolved') {
				expect(result.auditEvents).toEqual([
					{ eventName: 'n8n.audit.cluster.version-mismatch.resolved', payload: {} },
				]);
			} else {
				expect(result.auditEvents).toBeUndefined();
			}

			expect(result.pushNotifications).toBeUndefined();
		});
	});

	it('treats the version set as order-independent for deduplication', async () => {
		const previous = versions('1.1.0', '1.0.0');
		const current = versions('1.0.0', '1.1.0');

		const result = await check.run(makeContext(current, previous));

		expect(result.warnings).toHaveLength(1);
		expect(result.auditEvents).toBeUndefined();
	});

	it('reports the sorted list of versions in warning context and audit payload', async () => {
		const current = versions('1.1.0', '1.0.0', '1.0.0');

		const result = await check.run(makeContext(current));

		expect(result.warnings?.[0].context).toEqual({ versions: ['1.0.0', '1.1.0'] });
		expect(result.warnings?.[0].message).toBe(
			'Detected multiple n8n versions in the cluster: 1.0.0, 1.1.0',
		);
		expect(result.auditEvents?.[0].payload).toEqual({ versions: ['1.0.0', '1.1.0'] });
	});
});

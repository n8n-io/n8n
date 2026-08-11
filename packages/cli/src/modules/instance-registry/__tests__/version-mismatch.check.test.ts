import type { InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext, ClusterStateDiff } from '@n8n/decorators';

import { VersionMismatchCheck } from '../checks/version-mismatch.check';

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

const emptyDiff: ClusterStateDiff = {
	added: [],
	removed: [],
	changed: [],
};

const makeContext = (currentState: Map<string, InstanceRegistration>): ClusterCheckContext => ({
	currentState,
	previousState: new Map(),
	diff: emptyDiff,
});

describe('VersionMismatchCheck', () => {
	const check = new VersionMismatchCheck();

	it('returns no warnings when currentState is empty', async () => {
		const result = await check.run(makeContext(new Map()));

		expect(result).toEqual({});
	});

	it('returns no warnings when a single instance is present', async () => {
		const result = await check.run(
			makeContext(new Map([['k1', makeInstance({ instanceKey: 'k1', version: '1.0.0' })]])),
		);

		expect(result).toEqual({});
	});

	it('returns no warnings when multiple instances share a version', async () => {
		const result = await check.run(
			makeContext(
				new Map([
					['k1', makeInstance({ instanceKey: 'k1', version: '1.0.0' })],
					['k2', makeInstance({ instanceKey: 'k2', version: '1.0.0' })],
					['k3', makeInstance({ instanceKey: 'k3', version: '1.0.0' })],
				]),
			),
		);

		expect(result).toEqual({});
	});

	it('emits a version-mismatch warning when distinct versions are present', async () => {
		const result = await check.run(
			makeContext(
				new Map([
					['k1', makeInstance({ instanceKey: 'k1', version: '1.0.0' })],
					['k2', makeInstance({ instanceKey: 'k2', version: '1.1.0' })],
					['k3', makeInstance({ instanceKey: 'k3', version: '1.0.0' })],
				]),
			),
		);

		expect(result.warnings).toHaveLength(1);
		const [warning] = result.warnings!;
		expect(warning.code).toBe('cluster.version-mismatch');
		expect(warning.severity).toBe('error');
		expect(warning.context).toEqual({ versions: ['1.0.0', '1.1.0'] });
	});
});

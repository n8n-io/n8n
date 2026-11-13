import { AGENT_QUEUE_DISPATCH_CAPABILITY, type InstanceRegistration } from '@n8n/api-types';
import type { ClusterCheckContext } from '@n8n/decorators';

import { AgentQueueModeCheck } from '../../checks/agent-queue-mode.check';

const main = (hostId: string, enabled: boolean): InstanceRegistration => ({
	schemaVersion: 1 as const,
	instanceKey: hostId,
	hostId,
	instanceType: 'main',
	instanceRole: 'follower',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	...(enabled ? { capabilities: [AGENT_QUEUE_DISPATCH_CAPABILITY] } : {}),
});

const worker: InstanceRegistration = { ...main('worker', false), instanceType: 'worker' };

const context = (
	current: InstanceRegistration[],
	previous: InstanceRegistration[] = [],
): ClusterCheckContext => ({
	currentState: new Map(current.map((i) => [i.instanceKey, i])),
	previousState: new Map(previous.map((i) => [i.instanceKey, i])),
	diff: { added: [], removed: [], changed: [] },
});

describe('AgentQueueModeCheck', () => {
	const check = new AgentQueueModeCheck();

	it('reports nothing when all mains agree', async () => {
		const result = await check.run(context([main('a', true), main('b', true), worker]));
		expect(result.warnings ?? []).toEqual([]);
		expect(result.auditEvents ?? []).toEqual([]);
	});

	it('ignores workers, which do not advertise dispatch', async () => {
		const result = await check.run(context([main('a', true), worker]));
		expect(result.warnings ?? []).toEqual([]);
	});

	it('reports mains that disagree, once', async () => {
		const mismatch = [main('a', true), main('b', false)];
		const first = await check.run(context(mismatch));
		expect(first.warnings).toEqual([
			expect.objectContaining({
				code: 'cluster.agent-queue-mode-mismatch',
				severity: 'error',
				context: { enabledOn: ['a'], disabledOn: ['b'] },
			}),
		]);
		expect(first.auditEvents).toEqual([
			expect.objectContaining({
				eventName: 'n8n.audit.cluster.agent-queue-mode-mismatch.detected',
			}),
		]);

		const again = await check.run(context(mismatch, mismatch));
		expect(again.auditEvents ?? []).toEqual([]);
	});

	it('reports when the mismatch is resolved', async () => {
		const result = await check.run(
			context([main('a', true), main('b', true)], [main('a', true), main('b', false)]),
		);
		expect(result.warnings ?? []).toEqual([]);
		expect(result.auditEvents).toEqual([
			expect.objectContaining({
				eventName: 'n8n.audit.cluster.agent-queue-mode-mismatch.resolved',
			}),
		]);
	});
});

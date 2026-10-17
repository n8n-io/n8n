import { mockLogger } from '@n8n/backend-test-utils';
import { sleep } from '@n8n/utils/sleep';
import { mock } from 'vitest-mock-extended';

import type { CodeSandboxConfig } from '../code-sandbox.config';
import type { CodeSandboxTimings, LeaseRecord } from '../code-sandbox-timings';
import { SandboxLeaseManager } from '../sandbox-lease-manager';
import type { ChannelHandlers } from '../task-api-client';

type Scope = 'node' | 'execution' | 'workflow';

class FakeClient {
	created: string[] = [];

	deleted: string[] = [];

	channels = new Map<string, ChannelHandlers>();

	failCreate = false;

	createDelayMs = 5;

	private n = 0;

	async createSandbox() {
		await new Promise((r) => setTimeout(r, this.createDelayMs));
		if (this.failCreate) throw new Error('runner unavailable');
		const id = `00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}`;
		this.created.push(id);
		return { id, runtime: 'n8n-js', runtimeVersion: '1', slots: 1, state: 'ready' };
	}

	async openChannel(id: string, handlers: ChannelHandlers) {
		this.channels.set(id, handlers);
		return { ws: { readyState: 1, OPEN: 1, ping() {}, close() {} }, runtimeVersion: '1' };
	}

	async deleteSandbox(id: string) {
		this.deleted.push(id);
	}
}

function setup(scope: Scope, overrides: Partial<CodeSandboxConfig> = {}) {
	const config = {
		scope,
		slots: scope === 'node' ? 1 : scope === 'execution' ? 2 : 4,
		maxPerKey: 4,
		idleTimeoutMs: 10_000,
		maxLifetimeMs: 60_000,
		runtime: 'n8n-js',
		taskMemoryMb: 512,
		spareWorkers: true,
		reuseWorkers: false,
		...overrides,
	} as CodeSandboxConfig;
	const leaseRecords: LeaseRecord[] = [];
	const timings = mock<CodeSandboxTimings>({
		lease: (r: LeaseRecord) => {
			leaseRecords.push(r);
		},
	});
	const manager = new SandboxLeaseManager(config, timings, mockLogger());
	const client = new FakeClient();
	(manager as unknown as { clientInstance: FakeClient }).clientInstance = client;
	return { manager, client, leaseRecords };
}

describe('SandboxLeaseManager', () => {
	it('shares one create between concurrent tasks of a key', async () => {
		const { manager, client } = setup('execution');
		const [a, b] = await Promise.all([manager.acquire('e:1', '1'), manager.acquire('e:1', '1')]);
		expect(client.created).toHaveLength(1);
		expect(a.lease).toBe(b.lease);
		expect(a.createdForTask).toBe(true);
		expect(b.createdForTask).toBe(false);
		expect(a.leaseHit).toBe(false);

		manager.onTaskEnd(a.lease);
		const c = await manager.acquire('e:1', '1');
		expect(c.leaseHit).toBe(true);
		expect(client.created).toHaveLength(1);
	});

	it('creates more sandboxes up to the limit, then queues tasks', async () => {
		const { manager, client } = setup('node', { maxPerKey: 2 } as Partial<CodeSandboxConfig>);
		const first = await Promise.all([manager.acquire('k', '1'), manager.acquire('k', '1')]);
		expect(client.created).toHaveLength(2);

		let thirdDone = false;
		const third = manager.acquire('k', '1').then((r) => {
			thirdDone = true;
			return r;
		});
		await sleep(20);
		expect(thirdDone).toBe(false);
		manager.onTaskEnd(first[0].lease);
		const r = await third;
		expect(r.lease).toBe(first[0].lease);
		expect(r.slotWaitMs).toBeGreaterThanOrEqual(15);
		expect(client.created).toHaveLength(2);
	});

	it('releases execution sandboxes when the execution ends', async () => {
		const { manager, client, leaseRecords } = setup('execution');
		const { lease } = await manager.acquire('e:1', '1');
		manager.onTaskEnd(lease);
		manager.releaseForExecution('1', 'execution_end');
		expect(client.deleted).toEqual([lease.sandboxId]);
		expect(leaseRecords).toHaveLength(1);
		expect(leaseRecords[0]).toMatchObject({
			releaseReason: 'execution_end',
			taskCount: 1,
			executionCount: 1,
		});
		expect(manager.leaseCount).toBe(0);
	});

	it('keeps workflow sandboxes after an execution ends and reuses them', async () => {
		const { manager, client, leaseRecords } = setup('workflow');
		const a = await manager.acquire('w:1', 'exec-a');
		manager.onTaskEnd(a.lease);
		manager.releaseForExecution('exec-a', 'execution_end');
		expect(client.deleted).toHaveLength(0);

		const b = await manager.acquire('w:1', 'exec-b');
		expect(b.lease).toBe(a.lease);
		expect(b.leaseHit).toBe(true);
		manager.onTaskEnd(b.lease);
		await manager.shutdown();
		expect(leaseRecords[0]).toMatchObject({ executionCount: 2, releaseReason: 'shutdown' });
	});

	it('releases an idle sandbox after the idle timeout', async () => {
		const { manager, client, leaseRecords } = setup('workflow', {
			idleTimeoutMs: 20,
		} as Partial<CodeSandboxConfig>);
		const { lease } = await manager.acquire('w:1', 'x');
		manager.onTaskEnd(lease);
		await sleep(50);
		expect(client.deleted).toEqual([lease.sandboxId]);
		expect(leaseRecords[0].releaseReason).toBe('idle');
	});

	it('drains a workflow sandbox after its max lifetime', async () => {
		const { manager, client, leaseRecords } = setup('workflow', {
			maxLifetimeMs: 30,
		} as Partial<CodeSandboxConfig>);
		const first = await manager.acquire('w:1', 'a');
		await sleep(50);
		expect(first.lease.state).toBe('draining');

		const second = await manager.acquire('w:1', 'b');
		expect(second.lease).not.toBe(first.lease);
		expect(client.created).toHaveLength(2);

		manager.onTaskEnd(first.lease);
		expect(client.deleted).toEqual([first.lease.sandboxId]);
		expect(leaseRecords[0].releaseReason).toBe('max_lifetime');
		manager.onTaskEnd(second.lease);
		await manager.shutdown();
	});

	it('breaks a lease when its channel closes and fails its tasks', async () => {
		const { manager, client, leaseRecords } = setup('execution');
		const { lease } = await manager.acquire('e:1', '1');
		const failed: string[] = [];
		lease.onBroken.add((reason) => failed.push(reason));
		client.channels.get(lease.sandboxId)!.onClose('1006 gone');
		expect(failed).toHaveLength(1);
		expect(leaseRecords[0].releaseReason).toBe('broken');
		expect(client.deleted).toEqual([lease.sandboxId]);
	});

	it('rejects the tasks when the create fails', async () => {
		const { manager, client, leaseRecords } = setup('execution');
		client.failCreate = true;
		await expect(manager.acquire('e:1', '1')).rejects.toThrow('runner unavailable');
		expect(leaseRecords[0].releaseReason).toBe('create_failed');
		expect(manager.leaseCount).toBe(0);
	});

	it('never gives a sandbox to another scope key', async () => {
		const { manager, client } = setup('node');
		const a = await manager.acquire('n:1:a', '1');
		manager.onTaskEnd(a.lease);
		const b = await manager.acquire('n:1:b', '1');
		expect(b.lease).not.toBe(a.lease);
		expect(client.created).toHaveLength(2);
		// b still runs a task: it drains and is released when the task ends.
		manager.releaseForExecution('1', 'execution_end');
		expect(client.deleted).toEqual([a.lease.sandboxId]);
		expect(b.lease.state).toBe('draining');
		manager.onTaskEnd(b.lease);
		expect(client.deleted.sort()).toEqual([...client.created].sort());
	});
});

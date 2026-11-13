import { mockLogger } from '@n8n/backend-test-utils';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CodeSandboxConfig } from '../code-sandbox.config';
import type { CodeSandboxTimings } from '../code-sandbox-timings';
import {
	SandboxCreateError,
	SandboxFullError,
	SandboxGoneError,
	SandboxQueueTimeoutError,
	SandboxScopeClient,
	sandboxName,
	type Placement,
	type PlacementStats,
} from '../sandbox-scope-client';
import { TaskApiError } from '../task-api-client';

type Scope = 'node' | 'execution' | 'workflow';

/** A sandbox service that keeps one current sandbox per name. */
class FakeService {
	requests: Array<Record<string, unknown>> = [];

	deletedNames: string[] = [];

	current = new Map<string, string>();

	createDelayMs = 5;

	failCreates = 0;

	private n = 0;

	async createSandbox(req: Record<string, unknown>) {
		this.requests.push(req);
		await new Promise((r) => setTimeout(r, this.createDelayMs));
		if (this.failCreates > 0) {
			this.failCreates--;
			throw new TaskApiError('runner unavailable', 503);
		}
		const name = req.name as string;
		const existing = this.current.get(name);
		if (existing) return { id: existing, name, created: false };
		const id = `sbx-${++this.n}`;
		this.current.set(name, id);
		return { id, name, created: true, timings: { create: 5 } };
	}

	async deleteSandboxesByName(name: string) {
		this.deletedNames.push(name);
		this.current.delete(name);
	}

	async getSandbox() {
		return {};
	}
}

function setup(scope: Scope = 'execution', overrides: Partial<CodeSandboxConfig> = {}) {
	const config = {
		scope,
		slots: 2,
		maxPerKey: 3,
		maxQueueMs: 1_000,
		idleTimeoutMs: 30_000,
		maxLifetimeMs: 60_000,
		taskMemoryMb: 512,
		spareWorkers: true,
		reuseWorkers: false,
		timings: false,
		...overrides,
	} as CodeSandboxConfig;
	const scopes = new SandboxScopeClient(
		config,
		mock<CodeSandboxTimings>(),
		mock<InstanceSettings>({ hostId: 'worker-1' }),
		mockLogger(),
	);
	const service = new FakeService();
	(scopes as unknown as { clientInstance: FakeService }).clientInstance = service;
	return { scopes, service, config };
}

const newStats = (): PlacementStats => ({ attempts: 0, fullRejects: 0, goneRetries: 0, waitMs: 0 });

describe('sandboxName', () => {
	const options = {
		runtime: 'n8n-js',
		runtimeVersion: '2.0.0',
		slots: 2,
		taskMemoryMb: 512,
		spareWorkers: true,
		reuseWorkers: false,
	};

	it('is the same for the same scope, options and shard', () => {
		expect(sandboxName('w:1', options, 0)).toBe(sandboxName('w:1', { ...options }, 0));
		expect(sandboxName('w:1', options, 0)).toMatch(/^c1-[0-9a-f]{40}$/);
	});

	it('differs by scope key, option and shard', () => {
		const base = sandboxName('w:1', options, 0);
		expect(sandboxName('w:2', options, 0)).not.toBe(base);
		expect(sandboxName('w:1', options, 1)).not.toBe(base);
		expect(sandboxName('w:1', { ...options, slots: 4 }, 0)).not.toBe(base);
		expect(sandboxName('w:1', { ...options, runtime: 'n8n-py' }, 0)).not.toBe(base);
		expect(sandboxName('w:1', { ...options, runtimeVersion: '2.0.1' }, 0)).not.toBe(base);
	});
});

describe('SandboxScopeClient', () => {
	it('creates the sandbox by name once and caches its id', async () => {
		const { scopes, service } = setup();
		const seen: Placement[] = [];
		for (let i = 0; i < 3; i++) {
			await scopes.run('e:1', 'n8n-js', '1', async (p) => seen.push(p), newStats());
		}
		expect(service.requests).toHaveLength(1);
		expect(service.requests[0]).toMatchObject({
			name: seen[0].name,
			runtime: 'n8n-js',
			slots: 2,
			idleTimeoutMs: 30_000,
			labels: { scopeKey: 'e:1', scopeType: 'execution', n8nProcessId: 'worker-1' },
		});
		expect(service.requests[0].maxAgeMs).toBeUndefined();
		expect(seen.map((p) => [p.cached, p.created])).toEqual([
			[false, true],
			[true, false],
			[true, false],
		]);
	});

	it('shares one create between concurrent tasks of a name', async () => {
		const { scopes, service } = setup();
		const ids = await Promise.all(
			[1, 2, 3].map(
				async () => await scopes.run('e:1', 'n8n-js', '1', async (p) => p.sandboxId, newStats()),
			),
		);
		expect(service.requests).toHaveLength(1);
		expect(new Set(ids).size).toBe(1);
	});

	it('shares the sandbox between processes', async () => {
		const a = setup('workflow');
		const b = setup('workflow');
		(b.scopes as unknown as { clientInstance: FakeService }).clientInstance = a.service;
		const idA = await a.scopes.run('w:1', 'n8n-js', '1', async (p) => p.sandboxId, newStats());
		let placementB: Placement | undefined;
		await b.scopes.run('w:1', 'n8n-js', '2', async (p) => (placementB = p), newStats());
		expect(placementB?.sandboxId).toBe(idA);
		expect(placementB?.created).toBe(false);
		expect(a.service.requests[0].maxAgeMs).toBe(60_000);
	});

	it('tries the next shard when a sandbox is full, and starts there next time', async () => {
		const { scopes, service } = setup();
		const shards: number[] = [];
		const stats = newStats();
		await scopes.run(
			'e:1',
			'n8n-js',
			'1',
			async (p) => {
				shards.push(p.shard);
				if (p.shard === 0) throw new SandboxFullError('full');
			},
			stats,
		);
		expect(shards).toEqual([0, 1]);
		expect(stats).toMatchObject({ attempts: 2, fullRejects: 1 });
		expect(service.requests).toHaveLength(2);

		const next: number[] = [];
		await scopes.run('e:1', 'n8n-js', '1', async (p) => next.push(p.shard), newStats());
		expect(next).toEqual([1]);
	});

	it('waits and retries when all shards are full', async () => {
		const { scopes } = setup();
		let calls = 0;
		const stats = newStats();
		await scopes.run(
			'e:1',
			'n8n-js',
			'1',
			async () => {
				if (++calls <= 3) throw new SandboxFullError('full');
			},
			stats,
		);
		expect(calls).toBe(4);
		expect(stats.fullRejects).toBe(3);
		expect(stats.waitMs).toBeGreaterThan(0);
	});

	it('gives up when the shards stay full until the deadline', async () => {
		const { scopes } = setup('execution', { maxQueueMs: 100 });
		await expect(
			scopes.run(
				'e:1',
				'n8n-js',
				'1',
				async () => {
					throw new SandboxFullError('full');
				},
				newStats(),
			),
		).rejects.toBeInstanceOf(SandboxQueueTimeoutError);
	});

	it('creates the name again when the sandbox drains or is gone', async () => {
		const { scopes, service } = setup();
		const ids: string[] = [];
		const stats = newStats();
		await scopes.run(
			'e:1',
			'n8n-js',
			'1',
			async (p) => {
				ids.push(p.sandboxId);
				if (ids.length === 1) {
					// The service moved the name (max age).
					service.current.delete(p.name);
					throw new SandboxGoneError('draining');
				}
			},
			stats,
		);
		expect(ids).toEqual(['sbx-1', 'sbx-2']);
		expect(stats.goneRetries).toBe(1);
	});

	it('stops after repeated gone errors', async () => {
		const { scopes, service } = setup();
		await expect(
			scopes.run(
				'e:1',
				'n8n-js',
				'1',
				async (p) => {
					service.current.delete(p.name);
					throw new SandboxGoneError('gone');
				},
				newStats(),
			),
		).rejects.toBeInstanceOf(SandboxGoneError);
		expect(service.requests).toHaveLength(3);
	});

	it('does not retry other task errors', async () => {
		const { scopes } = setup();
		let calls = 0;
		await expect(
			scopes.run(
				'e:1',
				'n8n-js',
				'1',
				async () => {
					calls++;
					throw new Error('user error');
				},
				newStats(),
			),
		).rejects.toThrow('user error');
		expect(calls).toBe(1);
	});

	it('retries a failed create once', async () => {
		const { scopes, service } = setup();
		service.failCreates = 1;
		await scopes.run('e:1', 'n8n-js', '1', async () => {}, newStats());
		expect(service.requests).toHaveLength(2);

		service.failCreates = 2;
		await expect(
			scopes.run('e:2', 'n8n-js', '1', async () => {}, newStats()),
		).rejects.toBeInstanceOf(SandboxCreateError);
	});

	it('closes the scopes of an execution by name, all shards and runtimes', async () => {
		const { scopes, service } = setup();
		await scopes.run('e:1', 'n8n-js', '1', async () => {}, newStats());
		await scopes.run('e:1:py', 'n8n-py', '1', async () => {}, newStats());
		await scopes.run('e:2', 'n8n-js', '2', async () => {}, newStats());

		scopes.closeExecution('1');
		await scopes.shutdown();
		expect(service.deletedNames).toHaveLength(6);
		const js = scopes.options('n8n-js');
		const py = scopes.options('n8n-py');
		expect(service.deletedNames).toEqual(
			expect.arrayContaining([
				sandboxName('e:1', js, 0),
				sandboxName('e:1', js, 2),
				sandboxName('e:1:py', py, 1),
			]),
		);
		expect(service.deletedNames).not.toContain(sandboxName('e:2', js, 0));
	});

	it('creates a new sandbox for a closed scope (resume after waiting)', async () => {
		const { scopes, service } = setup();
		const first = await scopes.run('e:1', 'n8n-js', '1', async (p) => p.sandboxId, newStats());
		scopes.closeExecution('1');
		await new Promise((r) => setImmediate(r));
		const second = await scopes.run('e:1', 'n8n-js', '1', async (p) => p.sandboxId, newStats());
		expect(second).not.toBe(first);
		expect(service.requests).toHaveLength(2);
	});

	it('does not close workflow scopes at execution end', async () => {
		const { scopes, service } = setup('workflow');
		await scopes.run('w:1', 'n8n-js', '1', async () => {}, newStats());
		scopes.closeExecution('1');
		await scopes.shutdown();
		expect(service.deletedNames).toHaveLength(0);
	});

	it('refuses tasks after shutdown', async () => {
		const { scopes } = setup();
		await scopes.shutdown();
		await expect(
			scopes.run('e:1', 'n8n-js', '1', async () => {}, newStats()),
		).rejects.toBeInstanceOf(SandboxCreateError);
	});
});

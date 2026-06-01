import type { Logger } from '@n8n/backend-common';
import { existsSync } from 'fs';
import type ivm from 'isolated-vm';
import { mock } from 'jest-mock-extended';
import path from 'path';

import {
	AgentIsolatePool,
	AgentIsolateSlot,
	PoolDisposedError,
	PoolExhaustedError,
} from '../runtime/agent-isolate-pool';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

// The runtime reads the library bundle from packages/cli/dist/agent-library-bundle.js.
// Build it on demand so the test can run without a prior `pnpm build`.
const BUNDLE_PATH = path.resolve(__dirname, '../../../../dist/agent-library-bundle.js');
async function ensureLibraryBundle() {
	if (existsSync(BUNDLE_PATH)) return;
	const { buildAgentLibraryBundle } = await import(
		path.resolve(__dirname, '../../../../scripts/bundle-agent-library.mjs')
	);
	await buildAgentLibraryBundle({ silent: true });
}

// No mocking — uses the real isolated-vm V8 isolate.

const logger = mock<Logger>();

const SIMPLE_TOOL_CODE = `
import { Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Tool('double')
  .description('Doubles a number')
  .input(z.object({ value: z.number() }))
  .handler(async (input) => ({ result: input.value * 2 }));
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Disable auto-replenishment on a pool instance so tests can control exactly
 * when slots are available. Because `replenish` is private we cast through any.
 */
function disableReplenish(pool: AgentIsolatePool): void {
	(pool as unknown as { replenish: () => void }).replenish = () => {};
}

// ---------------------------------------------------------------------------
// AgentIsolatePool — unit tests
// ---------------------------------------------------------------------------

describe('AgentIsolatePool', () => {
	let ivmModule: typeof ivm;
	const libraryBundle = '"use strict"; globalThis.__modules = {};';

	beforeAll(async () => {
		ivmModule = (await import('isolated-vm')).default;
	});

	function makePool(options?: ConstructorParameters<typeof AgentIsolatePool>[2]) {
		return new AgentIsolatePool(ivmModule, libraryBundle, options);
	}

	it('initialize() creates N slots', async () => {
		const pool = makePool({ size: 2 });
		disableReplenish(pool);
		await pool.initialize();

		const s1 = await pool.acquire();
		const s2 = await pool.acquire();

		expect(s1).toBeInstanceOf(AgentIsolateSlot);
		expect(s2).toBeInstanceOf(AgentIsolateSlot);

		pool.release(s1);
		pool.release(s2);
		await pool.dispose();
	});

	it('acquire() returns a healthy slot', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		expect(slot.isHealthy).toBe(true);
		expect(slot.isolate.isDisposed).toBe(false);

		pool.release(slot);
		await pool.dispose();
	});

	it('acquire() blocks when pool is empty, resolves after release', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire(); // pool now empty, replenishment disabled

		// Pool is empty — next acquire should return a pending Promise.
		let resolved = false;
		const pending = pool.acquire().then((s) => {
			resolved = true;
			return s;
		});

		// Flush microtask queue — should NOT resolve yet (no replenish, no release).
		await Promise.resolve();
		expect(resolved).toBe(false);

		// Release the slot — the queued acquire should receive it directly.
		pool.release(slot);
		const queued = await pending;
		expect(resolved).toBe(true);
		expect(queued.isHealthy).toBe(true);

		pool.release(queued);
		await pool.dispose();
	});

	it('acquire() rejects when queue depth exceeded', async () => {
		const pool = makePool({ size: 1, maxQueueDepth: 2 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire(); // exhaust pool

		// Fill the wait queue to capacity.
		const p1 = pool.acquire();
		const p2 = pool.acquire();

		// Next acquire exceeds maxQueueDepth.
		await expect(pool.acquire()).rejects.toBeInstanceOf(PoolExhaustedError);

		pool.release(slot);
		pool.release(await p1);
		pool.release(await p2);
		await pool.dispose();
	});

	it('release() returns a healthy slot back to the pool', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		pool.release(slot);

		const same = await pool.acquire();
		expect(same.isHealthy).toBe(true);

		pool.release(same);
		await pool.dispose();
	});

	it('release() discards an unhealthy slot and triggers replenishment', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		slot.isolate.dispose(); // simulate OOM
		expect(slot.isHealthy).toBe(false);

		// Re-enable real replenishment before releasing.
		(pool as unknown as { replenish: (attempt?: number) => void }).replenish = AgentIsolatePool
			.prototype['replenish' as keyof AgentIsolatePool] as () => void;

		pool.release(slot);

		// Wait for replenishment microtask to complete.
		await new Promise((r) => setTimeout(r, 50));

		const fresh = pool.tryAcquireSync();
		expect(fresh).not.toBeNull();
		expect(fresh!.isHealthy).toBe(true);

		pool.release(fresh!);
		await pool.dispose();
	});

	it('tryAcquireSync() returns a slot when the pool is non-empty', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = pool.tryAcquireSync();
		expect(slot).not.toBeNull();
		expect(slot!.isHealthy).toBe(true);

		pool.release(slot!);
		await pool.dispose();
	});

	it('tryAcquireSync() returns null when pool is empty', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire(); // drain pool
		expect(pool.tryAcquireSync()).toBeNull();

		pool.release(slot);
		await pool.dispose();
	});

	it('proactive recycling: high-heap slot is discarded on release', async () => {
		// highWaterMarkRatio=0 means any heap usage triggers recycling.
		const pool = makePool({ size: 1, highWaterMarkRatio: 0 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		pool.release(slot); // should be discarded, not returned to pool

		expect(slot.isolate.isDisposed).toBe(true);
		// Pool is now empty (slot was discarded, replenish disabled).
		expect(pool.tryAcquireSync()).toBeNull();

		await pool.dispose();
	});

	it('dispose() cleans up all slots', async () => {
		const pool = makePool({ size: 2 });
		disableReplenish(pool);
		await pool.initialize();

		const s1 = await pool.acquire();
		const s2 = await pool.acquire();
		pool.release(s1);
		pool.release(s2);

		const iso1 = s1.isolate;
		const iso2 = s2.isolate;

		await pool.dispose();

		expect(iso1.isDisposed).toBe(true);
		expect(iso2.isDisposed).toBe(true);
	});

	it('acquire() after dispose() throws PoolDisposedError', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();
		await pool.dispose();

		await expect(pool.acquire()).rejects.toBeInstanceOf(PoolDisposedError);
	});

	it('dispose() rejects pending waiters with PoolDisposedError', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire(); // drain pool
		const pending = pool.acquire(); // will be queued

		await pool.dispose(); // rejects all waiters immediately
		pool.release(slot); // cleanup (slot is discarded since pool is disposed)

		await expect(pending).rejects.toBeInstanceOf(PoolDisposedError);
	});

	it('replenish retries on slot creation failure', async () => {
		// Use size=2 so acquiring 1 slot triggers replenishment of the 2nd.
		const pool = makePool({ size: 2 });
		await pool.initialize(); // starts with 2 real slots

		// Patch createSlot to track calls and fail.
		let attempts = 0;
		(pool as unknown as { createSlot: () => AgentIsolateSlot }).createSlot = () => {
			attempts++;
			throw new Error('simulated slot creation failure');
		};

		// Acquiring a slot triggers replenish() which calls the patched createSlot.
		const slot = await pool.acquire();

		// Wait for the replenish microtask (Promise.resolve().then(...)) to run.
		await new Promise((r) => setTimeout(r, 20));

		expect(attempts).toBeGreaterThan(0);

		pool.release(slot);
		await pool.dispose();
	});
});

// ---------------------------------------------------------------------------
// AgentSecureRuntime — describeToolSecurely and executeToolInIsolate
// ---------------------------------------------------------------------------

describe('AgentSecureRuntime', () => {
	let runtime: AgentSecureRuntime;

	beforeAll(async () => {
		await ensureLibraryBundle();
	});

	beforeEach(() => {
		runtime = new AgentSecureRuntime(logger);
	});

	afterEach(() => {
		runtime.dispose();
	});

	it('describeToolSecurely returns ToolDescriptor from valid tool code', async () => {
		const descriptor = await runtime.describeToolSecurely(SIMPLE_TOOL_CODE);

		expect(descriptor.name).toBe('double');
		expect(descriptor.description).toBe('Doubles a number');
		expect(descriptor.inputSchema).toBeDefined();
		expect(descriptor.outputSchema).toBeNull();
	});

	it('describeToolSecurely throws on invalid TypeScript', async () => {
		const badCode = 'this is not valid typescript @@@ {{{';
		await expect(runtime.describeToolSecurely(badCode)).rejects.toThrow();
	});

	it('describeToolSecurely throws when no Tool is exported', async () => {
		const noTool = 'export const foo = 42;';
		await expect(runtime.describeToolSecurely(noTool)).rejects.toThrow(/No Tool found/);
	});

	it('executeToolInIsolate executes a tool handler', async () => {
		const result = await runtime.executeToolInIsolate(SIMPLE_TOOL_CODE, { value: 21 }, {});
		expect(result).toEqual({ result: 42 });
	});

	it('concurrent describeToolSecurely calls all resolve', async () => {
		const results = await Promise.all([
			runtime.describeToolSecurely(SIMPLE_TOOL_CODE),
			runtime.describeToolSecurely(SIMPLE_TOOL_CODE),
			runtime.describeToolSecurely(SIMPLE_TOOL_CODE),
		]);

		expect(results).toHaveLength(3);
		for (const descriptor of results) {
			expect(descriptor.name).toBe('double');
		}
	});

	it('libraryBundle is not re-read after an OOM (cached string is reused)', async () => {
		await runtime.describeToolSecurely(SIMPLE_TOOL_CODE); // warm up

		const bundleBefore = (runtime as unknown as { libraryBundle: string }).libraryBundle;
		expect(bundleBefore).toBeTruthy();

		// Simulate OOM by disposing a slot's isolate and releasing it.
		const pool = (runtime as unknown as { pool: AgentIsolatePool }).pool;
		expect(pool).not.toBeNull();
		const slot = pool?.tryAcquireSync();
		expect(slot).not.toBeNull();
		slot?.isolate.dispose(); // mark as unhealthy
		if (slot) pool?.release(slot); // pool discards it and starts replenishment

		await new Promise((r) => setTimeout(r, 100)); // wait for replenishment

		await runtime.describeToolSecurely(SIMPLE_TOOL_CODE);

		const bundleAfter = (runtime as unknown as { libraryBundle: string }).libraryBundle;
		expect(bundleAfter).toBe(bundleBefore);
	});

	it('dispose() clears the pool — pool reference is null afterwards', async () => {
		await runtime.describeToolSecurely(SIMPLE_TOOL_CODE);
		runtime.dispose();

		expect((runtime as unknown as { pool: AgentIsolatePool | null }).pool).toBeNull();
	});
});

import type { Logger } from '@n8n/backend-common';
import type ivm from 'isolated-vm';
import { mock } from 'jest-mock-extended';

import {
	AgentIsolatePool,
	AgentIsolateSlot,
	PoolDisposedError,
	PoolExhaustedError,
} from '../agent-isolate-pool';
import { AgentSecureRuntime } from '../agent-secure-runtime';

// No mocking — uses the real isolated-vm V8 isolate.

const logger = mock<Logger>();

const SIMPLE_AGENT_CODE = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const helper = (x: number) => x * 2;

export default new Agent('test-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .credential('test-cred')
  .instructions('Be helpful')
  .tool(
    new Tool('double')
      .description('Doubles a number')
      .input(z.object({ value: z.number() }))
      .handler(async (input) => ({ result: helper(input.value) }))
  );
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
// AgentSecureRuntime — existing integration tests (adapted for pool)
// ---------------------------------------------------------------------------

describe('AgentSecureRuntime', () => {
	let runtime: AgentSecureRuntime;

	beforeEach(() => {
		runtime = new AgentSecureRuntime(logger);
	});

	afterEach(() => {
		runtime.dispose();
	});

	it('describeSecurely returns AgentSchema from valid agent code', async () => {
		const schema = await runtime.describeSecurely(SIMPLE_AGENT_CODE);

		expect(schema).toBeDefined();
		expect(schema.model.name).toBe('claude-sonnet-4-5');
		expect(schema.credential).toBe('test-cred');
		expect(schema.instructions).toBe('Be helpful');
		expect(schema.tools).toHaveLength(1);
		expect(schema.tools[0].name).toBe('double');
		expect(schema.tools[0].description).toBe('Doubles a number');
		expect(schema.tools[0].handlerSource).toBeTruthy();
		expect(schema.tools[0].inputSchemaSource).toBeTruthy();
	});

	it('describeSecurely throws on invalid code', async () => {
		const badCode = 'this is not valid typescript @@@ {{{';
		await expect(runtime.describeSecurely(badCode)).rejects.toThrow();
	});

	it('describeSecurely throws when no agent is exported', async () => {
		const noAgent = 'export const foo = 42;';
		await expect(runtime.describeSecurely(noAgent)).rejects.toThrow(/No agent found/);
	});

	it('executeInModule executes a tool handler preserving closures', async () => {
		const result = await runtime.executeInModule(SIMPLE_AGENT_CODE, 'tool', 'double', {
			input: { value: 21 },
		});
		expect(result).toEqual({ result: 42 });
	});

	it('executeInModule returns suspend marker when tool calls ctx.suspend()', async () => {
		const SUSPEND_AGENT_CODE = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Agent('suspend-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .credential('test-cred')
  .instructions('Be helpful')
  .tool(
    new Tool('approve')
      .description('Needs approval')
      .input(z.object({ action: z.string() }))
      .suspend(z.object({ message: z.string() }))
      .resume(z.object({ approved: z.boolean() }))
      .handler(async (input, ctx) => {
        if (!ctx.resumeData) {
          return await ctx.suspend({ message: 'Approve ' + input.action + '?' });
        }
        return { approved: ctx.resumeData.approved };
      })
  );
`;
		const result = await runtime.executeInModule(SUSPEND_AGENT_CODE, 'tool', 'approve', {
			input: { action: 'deploy' },
			ctx: {},
		});

		const suspendMarker = Symbol.for('n8n.agent.suspend');
		expect(result).toBeDefined();
		expect((result as Record<symbol, unknown>)[suspendMarker]).toBe(true);
		expect((result as Record<string, unknown>).payload).toEqual({
			message: 'Approve deploy?',
		});
	});

	it('evaluateZodSource converts a Zod schema to JSON Schema', async () => {
		const jsonSchema = await runtime.evaluateZodSource(
			'z.object({ name: z.string(), age: z.number() })',
		);

		expect(jsonSchema).toBeDefined();
		expect(jsonSchema.type).toBe('object');
		expect(jsonSchema.properties).toBeDefined();
		const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
		expect(props.name).toBeDefined();
		expect(props.name.type).toBe('string');
		expect(props.age).toBeDefined();
		expect(props.age.type).toBe('number');
	});

	it('evaluateZodSource handles nested schemas', async () => {
		const jsonSchema = await runtime.evaluateZodSource(
			'z.object({ address: z.object({ street: z.string(), zip: z.string() }) })',
		);

		expect(jsonSchema.type).toBe('object');
		const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
		expect(props.address).toBeDefined();
		expect(props.address.type).toBe('object');
	});

	it('describeSecurely handles a fully-featured agent: tools, toMessage, suspend/resume, WorkflowTool, MCP, eval, memory, thinking', async () => {
		const FULL_FEATURED_AGENT_CODE = `
import { Agent, Tool, Eval, Memory, McpClient } from '@n8n/agents';
import { WorkflowTool } from '@n8n/agents-utils';
import { z } from 'zod';

export default new Agent('full-featured-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .credential('anthropic')
  .instructions('You are a comprehensive assistant with all SDK features enabled.')
  .tool(
    new Tool('search_web')
      .description('Search the web for information')
      .input(z.object({
        query: z.string().describe('The search query'),
        maxResults: z.number().optional().describe('Max results to return'),
      }))
      .output(z.object({
        results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() })),
      }))
      .toMessage((output) => ({
        type: 'custom',
        components: [
          { type: 'section', text: '**Search Results**' },
          { type: 'divider' },
          ...output.results.map((r) => ({ type: 'section' as const, text: r.title + ': ' + r.url })),
        ],
      }))
      .handler(async ({ query }) => {
        return { results: [{ title: 'Result', url: 'https://example.com', snippet: 'Snippet for ' + query }] };
      })
  )
  .tool(
    new Tool('send_report')
      .description('Send a report — requires human approval first')
      .input(z.object({ recipient: z.string(), content: z.string() }))
      .suspend(z.object({ preview: z.string(), recipient: z.string() }))
      .resume(z.object({ approved: z.boolean() }))
      .handler(async (input, ctx) => {
        if (!ctx.resumeData) {
          return await ctx.suspend({ preview: input.content, recipient: input.recipient });
        }
        if (!ctx.resumeData.approved) {
          return { sent: false, reason: 'Rejected by user' };
        }
        return { sent: true, recipient: input.recipient };
      })
  )
  .tool(new WorkflowTool('Send Welcome Email'))
  .mcp(new McpClient([
    { name: 'browser-tools', url: 'http://localhost:9222/mcp', transport: 'streamableHttp' },
  ]))
  .eval(
    new Eval('response-quality')
      .description('Checks whether the response is substantive')
      .check(async (input) => ({
        score: input.response.length > 20 ? 1 : 0,
        label: input.response.length > 20 ? 'pass' : 'fail',
      }))
  )
  .memory(new Memory().lastMessages(50))
  .checkpoint('memory')
  .thinking('anthropic', { budgetTokens: 2048 });
`;

		const schema = await runtime.describeSecurely(FULL_FEATURED_AGENT_CODE);

		// --- Model & credential ---
		expect(schema.model.provider).toBe('anthropic');
		expect(schema.model.name).toBe('claude-sonnet-4-5');
		expect(schema.credential).toBe('anthropic');
		expect(schema.instructions).toContain('comprehensive assistant');

		// --- Tools ---
		// 3 total: search_web (editable), send_report (editable), Send Welcome Email (workflow marker)
		expect(schema.tools).toHaveLength(3);

		// search_web — custom tool with input/output schemas and toMessage
		const searchTool = schema.tools.find((t) => t.name === 'search_web')!;
		expect(searchTool).toBeDefined();
		expect(searchTool.editable).toBe(true);
		expect(searchTool.description).toBe('Search the web for information');
		expect(searchTool.handlerSource).toContain('Snippet for');
		expect(searchTool.inputSchemaSource).toContain('z.object');
		expect(searchTool.outputSchemaSource).toContain('z.array');
		expect(searchTool.toMessageSource).toContain('Search Results');
		expect(searchTool.hasToMessage).toBe(true);
		expect(searchTool.hasSuspend).toBe(false);

		// send_report — HITL tool with suspend/resume
		const reportTool = schema.tools.find((t) => t.name === 'send_report')!;
		expect(reportTool).toBeDefined();
		expect(reportTool.editable).toBe(true);
		expect(reportTool.hasSuspend).toBe(true);
		expect(reportTool.hasResume).toBe(true);
		expect(reportTool.suspendSchemaSource).toContain('preview');
		expect(reportTool.resumeSchemaSource).toContain('approved');
		expect(reportTool.handlerSource).toContain('ctx.resumeData');

		// WorkflowTool — non-editable platform marker
		const workflowTool = schema.tools.find((t) => t.name === 'Send Welcome Email')!;
		expect(workflowTool).toBeDefined();
		expect(workflowTool.editable).toBe(false);
		expect(workflowTool.metadata?.workflowTool).toBe(true);

		// --- MCP ---
		expect(schema.mcp).not.toBeNull();
		expect(schema.mcp).toHaveLength(1);
		expect(schema.mcp![0].name).toBe('browser-tools');
		expect(schema.mcp![0].configSource).toContain('streamableHttp');

		// --- Evaluations ---
		expect(schema.evaluations).toHaveLength(1);
		const evalEntry = schema.evaluations[0];
		expect(evalEntry.name).toBe('response-quality');
		expect(evalEntry.type).toBe('check');
		expect(evalEntry.description).toBe('Checks whether the response is substantive');
		expect(evalEntry.handlerSource).toContain('input.response.length');

		// --- Memory ---
		expect(schema.memory).not.toBeNull();
		expect(schema.memory!.lastMessages).toBe(50);

		// --- Checkpoint ---
		expect(schema.checkpoint).toBe('memory');

		// --- Thinking ---
		expect(schema.config.thinking).not.toBeNull();
		expect(schema.config.thinking!.provider).toBe('anthropic');
		expect(schema.config.thinking!.budgetTokens).toBe(2048);
	});
});

// ---------------------------------------------------------------------------
// AgentSecureRuntime — pool integration tests
// ---------------------------------------------------------------------------

describe('AgentSecureRuntime — pool integration', () => {
	let runtime: AgentSecureRuntime;

	beforeEach(() => {
		runtime = new AgentSecureRuntime(logger);
	});

	afterEach(() => {
		runtime.dispose();
	});

	it('concurrent describeSecurely calls all resolve (pool size=2, 4 calls)', async () => {
		await runtime.describeSecurely(SIMPLE_AGENT_CODE); // warm up pool

		// 4 concurrent calls on a pool of size 2. The 3rd and 4th queue.
		const results = await Promise.all([
			runtime.describeSecurely(SIMPLE_AGENT_CODE),
			runtime.describeSecurely(SIMPLE_AGENT_CODE),
			runtime.describeSecurely(SIMPLE_AGENT_CODE),
			runtime.describeSecurely(SIMPLE_AGENT_CODE),
		]);

		expect(results).toHaveLength(4);
		for (const schema of results) {
			expect(schema.model.name).toBe('claude-sonnet-4-5');
			expect(schema.tools[0].name).toBe('double');
		}
	});

	it('concurrent mixed operations complete without interfering', async () => {
		await runtime.describeSecurely(SIMPLE_AGENT_CODE); // warm up

		const [schema, toolResult, zodResult] = await Promise.all([
			runtime.describeSecurely(SIMPLE_AGENT_CODE),
			runtime.executeInModule(SIMPLE_AGENT_CODE, 'tool', 'double', { input: { value: 7 } }),
			runtime.evaluateZodSource('z.object({ x: z.number() })'),
		]);

		expect(schema.tools[0].name).toBe('double');
		expect(toolResult).toEqual({ result: 14 });
		expect(zodResult.type).toBe('object');
	});

	it('executeToMessageSync throws when pool is not initialized', () => {
		expect(() => runtime.executeToMessageSync(SIMPLE_AGENT_CODE, 'double', {})).toThrow(
			/warm up the pool/,
		);
	});

	it('executeToMessageSync throws PoolExhaustedError when no slot is available', async () => {
		await runtime.describeSecurely(SIMPLE_AGENT_CODE); // initialize pool

		// Patch the prototype to make tryAcquireSync return null (empty pool).
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const original = AgentIsolatePool.prototype.tryAcquireSync;
		AgentIsolatePool.prototype.tryAcquireSync = () => null;

		try {
			expect(() => runtime.executeToMessageSync(SIMPLE_AGENT_CODE, 'double', {})).toThrow(
				PoolExhaustedError,
			);
		} finally {
			AgentIsolatePool.prototype.tryAcquireSync = original;
		}
	});

	it('libraryBundle is not re-bundled after an OOM (cached string is reused)', async () => {
		await runtime.describeSecurely(SIMPLE_AGENT_CODE);

		// Capture the cached bundle reference.
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

		// Run again — should succeed without rebuilding the bundle.
		await runtime.describeSecurely(SIMPLE_AGENT_CODE);

		const bundleAfter = (runtime as unknown as { libraryBundle: string }).libraryBundle;
		// Same reference — the bundle was NOT rebuilt.
		expect(bundleAfter).toBe(bundleBefore);
	});

	it('dispose() clears the pool — pool reference is null afterwards', async () => {
		await runtime.describeSecurely(SIMPLE_AGENT_CODE);
		runtime.dispose();

		expect((runtime as unknown as { pool: AgentIsolatePool | null }).pool).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// AgentSecureRuntime — imports regression
// ---------------------------------------------------------------------------

describe('AgentSecureRuntime — does not throw "Not supported"', () => {
	let rt: AgentSecureRuntime;

	beforeAll(() => {
		rt = new AgentSecureRuntime(logger);
	});

	afterAll(() => {
		rt.dispose();
	});

	it('describeSecurely succeeds — does not fail with "Not supported" because of external imports', async () => {
		const schema = await rt.describeSecurely(SIMPLE_AGENT_CODE);

		expect(schema.model.name).toBe('claude-sonnet-4-5');
		expect(schema.tools).toHaveLength(1);
		expect(schema.tools[0].name).toBe('double');
	});
});

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import { createTestEngine, destroyTestEngine, saveWorkflow, cleanDatabase } from './test-engine';
import type { TestEngine } from './test-engine';
import { TranspilerService } from '../../src/transpiler/transpiler.service';
import { WorkflowEntity } from '../../src/database/entities/workflow.entity';

/**
 * Compilation tests exercise the TranspilerService and the workflow save path.
 * Most compilation tests are pure unit tests (no database needed), but we test
 * the full save path (transpile -> persist) as integration tests gated on DATABASE_URL.
 *
 * The unit-level compilation tests do NOT require a database.
 */

// ---------------------------------------------------------------------------
// Unit-level compilation tests (no DATABASE_URL required)
// ---------------------------------------------------------------------------

describe('Compilation (unit)', () => {
	const transpiler = new TranspilerService();

	// -----------------------------------------------------------------------
	// Valid scripts
	// -----------------------------------------------------------------------

	it('valid script produces compiled_code, graph, and source_map', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Valid',
	async run(ctx) {
		const result = await ctx.step({ name: 'do-work' }, async () => ({ done: true }));
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		expect(result.code).toBeTruthy();
		expect(result.graph.nodes.length).toBeGreaterThan(0);
		expect(result.sourceMap).not.toBeNull();
	});

	// -----------------------------------------------------------------------
	// Syntax error -> compilation error or degraded output
	// -----------------------------------------------------------------------

	it('handles syntax errors in source code', () => {
		// A truly broken source that ts-morph cannot recover from.
		// defineWorkflow is present but the object literal is completely malformed.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({{{{{
`;

		const result = transpiler.compile(source);

		// The transpiler should either report errors or produce an empty/minimal graph.
		// ts-morph is tolerant, so we accept either outcome:
		// 1. Errors reported -> correct behavior
		// 2. No errors but no steps found -> still correct (run() method not found)
		if (result.errors.length > 0) {
			expect(result.errors[0].severity).toBe('error');
		} else {
			expect(result.graph.nodes).toHaveLength(0);
		}
	});

	// -----------------------------------------------------------------------
	// Duplicate step name -> 422
	// -----------------------------------------------------------------------

	it('duplicate step name produces compilation error', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Dupes',
	async run(ctx) {
		await ctx.step({ name: 'same-name' }, async () => ({ a: 1 }));
		await ctx.step({ name: 'same-name' }, async () => ({ b: 2 }));
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('Duplicate step name');
	});

	// -----------------------------------------------------------------------
	// Empty script -> 422
	// -----------------------------------------------------------------------

	it('empty script produces compilation error', () => {
		const result = transpiler.compile('');

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('Empty source');
		expect(result.code).toBe('');
		expect(result.graph).toEqual({ nodes: [], edges: [] });
	});

	it('whitespace-only script produces compilation error', () => {
		const result = transpiler.compile('   \n\t\n   ');

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('Empty source');
	});

	// -----------------------------------------------------------------------
	// Script without defineWorkflow -> 422
	// -----------------------------------------------------------------------

	it('script without defineWorkflow produces compilation error', () => {
		const source = `
const x = 1;
console.log(x);
`;

		const result = transpiler.compile(source);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('defineWorkflow');
	});

	// -----------------------------------------------------------------------
	// defineWorkflow without run method -> 422
	// -----------------------------------------------------------------------

	it('defineWorkflow without run method produces compilation error', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoRun',
});
`;

		const result = transpiler.compile(source);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('run()');
	});

	// -----------------------------------------------------------------------
	// run() with no ctx.step calls -> 422
	// -----------------------------------------------------------------------

	it('run() with no ctx.step calls produces compilation error', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoSteps',
	async run(ctx) {
		return { nothing: true };
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('ctx.step()');
	});

	// -----------------------------------------------------------------------
	// Helper functions included in output
	// -----------------------------------------------------------------------

	it('includes helper functions referenced by steps in compiled output', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

function double(x: number): number {
	return x * 2;
}

export default defineWorkflow({
	name: 'Helpers',
	async run(ctx) {
		const result = await ctx.step({ name: 'compute' }, async () => {
			return { value: double(21) };
		});
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		expect(result.code).toContain('double');
	});

	// -----------------------------------------------------------------------
	// Unreferenced helper functions excluded (tree-shaking)
	// -----------------------------------------------------------------------

	it('excludes helper functions not referenced by any step', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

function used(x: number): number {
	return x * 2;
}

function unused(x: number): number {
	return x * 3;
}

export default defineWorkflow({
	name: 'TreeShake',
	async run(ctx) {
		const result = await ctx.step({ name: 'compute' }, async () => {
			return { value: used(10) };
		});
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		expect(result.code).toContain('used');
		expect(result.code).not.toContain('unused');
	});

	// -----------------------------------------------------------------------
	// Transitive helper dependency
	// -----------------------------------------------------------------------

	it('includes transitive helper dependencies', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

function base(x: number): number {
	return x + 1;
}

function wrapper(x: number): number {
	return base(x) * 2;
}

export default defineWorkflow({
	name: 'Transitive',
	async run(ctx) {
		const result = await ctx.step({ name: 'compute' }, async () => {
			return { value: wrapper(5) };
		});
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		// wrapper is directly referenced, base is transitively referenced
		expect(result.code).toContain('wrapper');
		expect(result.code).toContain('base');
	});

	// -----------------------------------------------------------------------
	// Helper function with TypeScript types -- types stripped
	// -----------------------------------------------------------------------

	it('strips TypeScript types from helper functions', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

interface Item {
	name: string;
	price: number;
}

function formatItem(item: Item): string {
	return item.name + ': $' + item.price.toFixed(2);
}

export default defineWorkflow({
	name: 'TypeStrip',
	async run(ctx) {
		const result = await ctx.step({ name: 'format' }, async () => {
			return { formatted: formatItem({ name: 'Widget', price: 9.99 }) };
		});
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		// The compiled output should contain the function but without type annotations
		expect(result.code).toContain('formatItem');
		// esbuild strips types, so there should be no ': string' or ': Item' in the output
		expect(result.code).not.toContain(': Item');
	});

	// -----------------------------------------------------------------------
	// Retry config parsed correctly
	// -----------------------------------------------------------------------

	it('parses retry config from step options', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'RetryConfig',
	async run(ctx) {
		const result = await ctx.step({
			name: 'retrying',
			retry: { maxAttempts: 5, baseDelay: 500, maxDelay: 10000, jitter: true },
		}, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;

		const result = transpiler.compile(source);

		expect(result.errors).toHaveLength(0);
		const node = result.graph.nodes.find((n) => n.name === 'retrying');
		expect(node).toBeDefined();
		expect(node!.config.retryConfig).toEqual({
			maxAttempts: 5,
			baseDelay: 500,
			maxDelay: 10000,
			jitter: true,
		});
	});

	// -----------------------------------------------------------------------
	// Deterministic compilation
	// -----------------------------------------------------------------------

	it('produces identical output for the same source', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Deterministic',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => ({ val: 1 }));
		const b = await ctx.step({ name: 'step-b' }, async () => ({ val: a.val + 1 }));
		return b;
	},
});
`;

		const result1 = transpiler.compile(source);
		const result2 = transpiler.compile(source);

		expect(result1.graph).toEqual(result2.graph);
		expect(result1.code).toEqual(result2.code);
	});
});

// ---------------------------------------------------------------------------
// Integration-level compilation tests (require DATABASE_URL)
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.DATABASE_URL)('Compilation (integration)', () => {
	let engine: TestEngine;

	beforeAll(async () => {
		engine = await createTestEngine();
	});

	afterAll(async () => {
		await destroyTestEngine(engine);
	});

	afterEach(async () => {
		await cleanDatabase(engine.dataSource);
		engine.stepProcessor.clearModuleCache();
	});

	// -----------------------------------------------------------------------
	// Valid script saves compiled_code + graph to database
	// -----------------------------------------------------------------------

	it('stores compiled_code and graph in the database', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Stored',
	async run(ctx) {
		const result = await ctx.step({ name: 'work' }, async () => ({ done: true }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		const workflow = await engine.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.where('w.id = :id AND w.version = :version', { id: workflowId, version: 1 })
			.getOne();

		expect(workflow).toBeDefined();
		expect(workflow!.compiledCode).toBeTruthy();
		expect(workflow!.graph).toBeDefined();
		expect(workflow!.sourceMap).not.toBeNull();

		// Graph should have a trigger node + at least one step node
		const graph = workflow!.graph as { nodes: Array<{ type: string }> };
		expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
		expect(graph.nodes.some((n) => n.type === 'trigger')).toBe(true);
		expect(graph.nodes.some((n) => n.type === 'step')).toBe(true);
	});

	// -----------------------------------------------------------------------
	// Compilation errors prevent save
	// -----------------------------------------------------------------------

	it('does not save workflow when compilation fails', async () => {
		const source = ''; // Empty source -> compilation error

		await expect(saveWorkflow(engine, source)).rejects.toThrow('Compilation failed');

		// Verify nothing was saved to the database
		const count = await engine.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.getCount();

		expect(count).toBe(0);
	});

	// -----------------------------------------------------------------------
	// Compiled code is executable
	// -----------------------------------------------------------------------

	it('compiled code executes correctly through the engine', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

function multiply(a: number, b: number): number {
	return a * b;
}

export default defineWorkflow({
	name: 'Executable',
	async run(ctx) {
		const data = await ctx.step({ name: 'produce' }, async () => {
			return { value: multiply(6, 7) };
		});
		const result = await ctx.step({ name: 'transform' }, async () => {
			return { doubled: data.value * 2 };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		// Import executeAndWait at the call site
		const { executeAndWait } = await import('./test-engine');
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ doubled: 84 });
	});
});

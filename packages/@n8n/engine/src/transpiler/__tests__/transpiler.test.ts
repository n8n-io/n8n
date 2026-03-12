import { createHash } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { TranspilerService } from '../transpiler.service';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe('TranspilerService', () => {
	const transpiler = new TranspilerService();

	// -----------------------------------------------------------------------
	// 1. Hello World — simple 2-step linear workflow
	// -----------------------------------------------------------------------

	describe('Hello World — linear 2-step workflow', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Hello',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 42 };
		});
		const result = await ctx.step({ name: 'process' }, async () => {
			return { doubled: data.value * 2 };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('extracts 2 step nodes (plus trigger)', () => {
			const result = transpiler.compile(source);
			const stepNodes = result.graph.nodes.filter((n) => n.type === 'step');
			expect(stepNodes).toHaveLength(2);
		});

		it('graph has an implicit manual trigger node', () => {
			const result = transpiler.compile(source);
			const trigger = result.graph.nodes.find((n) => n.type === 'trigger');
			expect(trigger).toBeDefined();
			expect(trigger?.id).toBe('trigger');
		});

		it('graph step nodes have correct names', () => {
			const result = transpiler.compile(source);
			const names = result.graph.nodes
				.filter((n) => n.type === 'step')
				.map((n) => n.name)
				.sort();
			expect(names).toEqual(['fetch', 'process']);
		});

		it('graph nodes have deterministic IDs based on step name', () => {
			const result = transpiler.compile(source);
			const fetchNode = result.graph.nodes.find((n) => n.name === 'fetch');
			const processNode = result.graph.nodes.find((n) => n.name === 'process');

			expect(fetchNode?.id).toBe(sha256('fetch'));
			expect(processNode?.id).toBe(sha256('process'));
		});

		it('graph has trigger → fetch and fetch → process edges', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: fetchId }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: processId }),
			);
		});

		it('compiled code has 2 exported step functions', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');

			expect(result.code).toContain(`exports.step_${fetchId}`);
			expect(result.code).toContain(`exports.step_${processId}`);
		});

		it('process step injects data dependency from fetch via ctx.input', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');

			// The process step should inject: const data = ctx.input["<fetchId>"]
			// (esbuild normalizes quotes to double quotes)
			expect(result.code).toContain(`ctx.input["${fetchId}"]`);
		});

		it('generates a source map', () => {
			const result = transpiler.compile(source);
			expect(result.sourceMap).not.toBeNull();
		});

		it('stepFunctionRef matches the export name for step nodes', () => {
			const result = transpiler.compile(source);
			for (const node of result.graph.nodes.filter((n) => n.type === 'step')) {
				expect(result.code).toContain(`exports.${node.stepFunctionRef}`);
			}
		});
	});

	// -----------------------------------------------------------------------
	// 2. Conditional — if/else branching
	// -----------------------------------------------------------------------

	describe('Conditional — if/else branching', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Conditional',
	async run(ctx) {
		const check = await ctx.step({ name: 'check' }, async () => {
			return { approved: true };
		});
		if (check.approved) {
			await ctx.step({ name: 'approve' }, async () => {
				return { status: 'approved' };
			});
		} else {
			await ctx.step({ name: 'reject' }, async () => {
				return { status: 'rejected' };
			});
		}
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('extracts 3 step nodes: check, approve, reject', () => {
			const result = transpiler.compile(source);
			const names = result.graph.nodes
				.filter((n) => n.type === 'step')
				.map((n) => n.name)
				.sort();
			expect(names).toEqual(['approve', 'check', 'reject']);
		});

		it('approve edge has condition expression', () => {
			const result = transpiler.compile(source);
			const checkId = sha256('check');
			const approveId = sha256('approve');

			const approveEdge = result.graph.edges.find((e) => e.from === checkId && e.to === approveId);
			expect(approveEdge).toBeDefined();
			expect(approveEdge?.condition).toBeDefined();
			expect(approveEdge?.condition).toContain('output.approved');
		});

		it('reject edge has negated condition expression', () => {
			const result = transpiler.compile(source);
			const checkId = sha256('check');
			const rejectId = sha256('reject');

			const rejectEdge = result.graph.edges.find((e) => e.from === checkId && e.to === rejectId);
			expect(rejectEdge).toBeDefined();
			expect(rejectEdge?.condition).toBeDefined();
			expect(rejectEdge?.condition).toContain('!');
		});

		it('both branches present as graph nodes', () => {
			const result = transpiler.compile(source);
			const approveNode = result.graph.nodes.find((n) => n.name === 'approve');
			const rejectNode = result.graph.nodes.find((n) => n.name === 'reject');
			expect(approveNode).toBeDefined();
			expect(rejectNode).toBeDefined();
		});
	});

	// -----------------------------------------------------------------------
	// 3. Parallel — Promise.all with 2 steps
	// -----------------------------------------------------------------------

	describe('Parallel — Promise.all with independent steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Parallel',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => {
			return { fromA: true };
		});
		const b = await ctx.step({ name: 'step-b' }, async () => {
			return { fromB: true };
		});
		return { a, b };
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('extracts 2 step nodes (plus trigger)', () => {
			const result = transpiler.compile(source);
			const stepNodes = result.graph.nodes.filter((n) => n.type === 'step');
			expect(stepNodes).toHaveLength(2);
		});

		it('both steps connect from trigger (no inter-step dependency)', () => {
			const result = transpiler.compile(source);
			const stepAId = sha256('step-a');
			const stepBId = sha256('step-b');

			// step-a has no step dependencies, connects from trigger
			const edgeToA = result.graph.edges.find((e) => e.to === stepAId);
			expect(edgeToA?.from).toBe('trigger');

			// step-b has no step dependencies, connects from trigger
			const edgeToB = result.graph.edges.find((e) => e.to === stepBId);
			expect(edgeToB?.from).toBe('trigger');
		});

		it('no edge between step-a and step-b', () => {
			const result = transpiler.compile(source);
			const stepAId = sha256('step-a');
			const stepBId = sha256('step-b');

			const crossEdge = result.graph.edges.find(
				(e) => (e.from === stepAId && e.to === stepBId) || (e.from === stepBId && e.to === stepAId),
			);
			expect(crossEdge).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// 4. Helper functions — top-level helpers used in steps
	// -----------------------------------------------------------------------

	describe('Helper functions', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

function formatCurrency(amount: number, currency: string): string {
	return \`\${currency} \${amount.toFixed(2)}\`;
}

function buildLine(item: { name: string; price: number }): string {
	return \`\${item.name}: \${formatCurrency(item.price, 'USD')}\`;
}

export default defineWorkflow({
	name: 'Helpers',
	async run(ctx) {
		const items = await ctx.step({ name: 'fetch' }, async () => {
			return [{ name: 'Widget', price: 29.99 }];
		});
		const invoice = await ctx.step({ name: 'generate' }, async () => {
			const lines = items.map(item => buildLine(item));
			return { lines };
		});
		return invoice;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('helper functions are included in compiled output', () => {
			const result = transpiler.compile(source);
			expect(result.code).toContain('formatCurrency');
			expect(result.code).toContain('buildLine');
		});

		it('step functions can reference helpers', () => {
			const result = transpiler.compile(source);
			// The generate step should include buildLine reference
			expect(result.code).toContain('buildLine');
		});

		it('transitive helper dependencies are included', () => {
			const result = transpiler.compile(source);
			// buildLine calls formatCurrency, so both should be present
			expect(result.code).toContain('formatCurrency');
		});
	});

	// -----------------------------------------------------------------------
	// 5. Compilation errors
	// -----------------------------------------------------------------------

	describe('Compilation errors', () => {
		it('empty source produces an error', () => {
			const result = transpiler.compile('');
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain('Empty source');
		});

		it('whitespace-only source produces an error', () => {
			const result = transpiler.compile('   \n\t\n   ');
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain('Empty source');
		});

		it('source without defineWorkflow produces an error', () => {
			const result = transpiler.compile('const x = 1;');
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain('defineWorkflow');
		});

		it('duplicate step names produce an error', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Dupes',
	async run(ctx) {
		await ctx.step({ name: 'fetch' }, async () => ({ a: 1 }));
		await ctx.step({ name: 'fetch' }, async () => ({ b: 2 }));
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain("Duplicate step name: 'fetch'");
		});

		it('source with defineWorkflow but no run method produces an error', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoRun',
});
`;
			const result = transpiler.compile(source);
			expect(result.errors.length).toBeGreaterThan(0);
			// Type checker catches this as a type error (missing required 'run' property)
			expect(result.errors[0].message).toContain('WorkflowDefinition');
		});

		it('error results have empty code', () => {
			const result = transpiler.compile('');
			expect(result.code).toBe('');
		});

		it('error results have empty graph', () => {
			const result = transpiler.compile('');
			expect(result.graph).toEqual({ nodes: [], edges: [] });
		});
	});

	// -----------------------------------------------------------------------
	// 6. Retry config — step with retry options
	// -----------------------------------------------------------------------

	describe('Retry config', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Retry',
	async run(ctx) {
		const result = await ctx.step({
			name: 'flaky-api',
			retry: { maxAttempts: 3, baseDelay: 1000 },
		}, async () => {
			return { data: 'ok' };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph node has correct retryConfig', () => {
			const result = transpiler.compile(source);
			const node = result.graph.nodes.find((n) => n.name === 'flaky-api');
			expect(node).toBeDefined();
			expect(node?.config.retryConfig).toEqual({
				maxAttempts: 3,
				baseDelay: 1000,
			});
		});

		it('step ID is deterministic', () => {
			const result = transpiler.compile(source);
			const node = result.graph.nodes.find((n) => n.name === 'flaky-api');
			expect(node?.id).toBe(sha256('flaky-api'));
		});
	});

	// -----------------------------------------------------------------------
	// 7. Multi-step chain with variable passing
	// -----------------------------------------------------------------------

	describe('Multi-step chain', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Chain',
	async run(ctx) {
		const users = await ctx.step({ name: 'fetch-users' }, async () => {
			return [{ id: 1, name: 'Alice' }];
		});
		const enriched = await ctx.step({ name: 'enrich' }, async () => {
			return users.map(u => ({ ...u, enrichedAt: Date.now() }));
		});
		const count = await ctx.step({ name: 'count' }, async () => {
			return { total: enriched.length };
		});
		return count;
	},
});
`;

		it('creates a 3-step chain (plus trigger)', () => {
			const result = transpiler.compile(source);
			const stepNodes = result.graph.nodes.filter((n) => n.type === 'step');
			expect(stepNodes).toHaveLength(3);
		});

		it('creates correct dependency chain: trigger→fetch→enrich→count', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch-users');
			const enrichId = sha256('enrich');
			const countId = sha256('count');

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: fetchId }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: enrichId }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: enrichId, to: countId }),
			);
		});

		it('each step injects correct predecessor via ctx.input', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch-users');
			const enrichId = sha256('enrich');

			// enrich injects users from fetch-users (esbuild normalizes to double quotes)
			expect(result.code).toContain(`ctx.input["${fetchId}"]`);
			// count injects enriched from enrich
			expect(result.code).toContain(`ctx.input["${enrichId}"]`);
		});
	});

	// -----------------------------------------------------------------------
	// 8. Stability: compiling same source twice produces identical output
	// -----------------------------------------------------------------------

	describe('Determinism', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Stable',
	async run(ctx) {
		const x = await ctx.step({ name: 'alpha' }, async () => ({ val: 1 }));
		const y = await ctx.step({ name: 'beta' }, async () => ({ val: x.val + 1 }));
		return y;
	},
});
`;

		it('produces identical graph on repeated compilation', () => {
			const result1 = transpiler.compile(source);
			const result2 = transpiler.compile(source);

			expect(result1.graph).toEqual(result2.graph);
		});

		it('produces identical code on repeated compilation', () => {
			const result1 = transpiler.compile(source);
			const result2 = transpiler.compile(source);

			expect(result1.code).toEqual(result2.code);
		});
	});

	// -----------------------------------------------------------------------
	// 9. Display config — icon, color, description at top level
	// -----------------------------------------------------------------------

	describe('Display config', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Display',
	async run(ctx) {
		const result = await ctx.step({
			name: 'styled-step',
			icon: 'globe',
			color: '#3b82f6',
			description: 'A styled step',
		}, async () => {
			return { data: 'ok' };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph node has icon, color, description at config top level', () => {
			const result = transpiler.compile(source);
			const node = result.graph.nodes.find((n) => n.name === 'styled-step');
			expect(node).toBeDefined();
			expect(node?.config.icon).toBe('globe');
			expect(node?.config.color).toBe('#3b82f6');
			expect(node?.config.description).toBe('A styled step');
		});
	});

	// -----------------------------------------------------------------------
	// 10. Sleep — ctx.sleep() between steps
	// -----------------------------------------------------------------------

	describe('Sleep — ctx.sleep() between steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'SleepBetweenSteps',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 42 };
		});

		await ctx.sleep(5000);

		const result = await ctx.step({ name: 'process' }, async () => {
			return { doubled: data.value * 2 };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph has a sleep node', () => {
			const result = transpiler.compile(source);
			const sleepNodes = result.graph.nodes.filter((n) => n.type === 'sleep');
			expect(sleepNodes).toHaveLength(1);
		});

		it('sleep node has correct sleepMs config', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode?.config.sleepMs).toBe(5000);
			expect(sleepNode?.config.stepType).toBe('sleep');
		});

		it('sleep node has no step function ref', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode?.stepFunctionRef).toBe('');
		});

		it('edges route through sleep: fetch → sleep → process', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			// fetch → sleep
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: sleepNode!.id }),
			);
			// sleep → process
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processId }),
			);
			// No direct fetch → process edge
			const directEdge = result.graph.edges.find((e) => e.from === fetchId && e.to === processId);
			expect(directEdge).toBeUndefined();
		});

		it('compiled code does NOT contain a sleep step function', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(result.code).not.toContain(`exports.step_${sleepNode!.id}`);
		});

		it('still has trigger → fetch edge', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: fetchId }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Sleep at start — ctx.sleep() before any steps
	// -----------------------------------------------------------------------

	describe('Sleep at start — before first step', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'SleepAtStart',
	async run(ctx) {
		await ctx.sleep(1000);
		const result = await ctx.step({ name: 'process' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('edges route: trigger → sleep → process', () => {
			const result = transpiler.compile(source);
			const processId = sha256('process');
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: sleepNode!.id }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processId }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// 12. Multiple sleeps in sequence
	// -----------------------------------------------------------------------

	describe('Multiple sleeps in sequence', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'MultiSleep',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 1 };
		});

		await ctx.sleep(1000);
		await ctx.sleep(2000);

		const result = await ctx.step({ name: 'process' }, async () => {
			return { doubled: data.value * 2 };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph has 2 sleep nodes', () => {
			const result = transpiler.compile(source);
			const sleepNodes = result.graph.nodes.filter((n) => n.type === 'sleep');
			expect(sleepNodes).toHaveLength(2);
		});

		it('edges chain through both sleeps: fetch → sleep-0 → sleep-1 → process', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');
			const sleepNodes = result.graph.nodes.filter((n) => n.type === 'sleep');
			expect(sleepNodes).toHaveLength(2);

			// fetch → sleep-0
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: sleepNodes[0].id }),
			);
			// sleep-0 → sleep-1
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNodes[0].id, to: sleepNodes[1].id }),
			);
			// sleep-1 → process
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNodes[1].id, to: processId }),
			);
		});

		it('sleep nodes have correct durations', () => {
			const result = transpiler.compile(source);
			const sleepNodes = result.graph.nodes.filter((n) => n.type === 'sleep');
			expect(sleepNodes[0].config.sleepMs).toBe(1000);
			expect(sleepNodes[1].config.sleepMs).toBe(2000);
		});
	});

	// -----------------------------------------------------------------------
	// 13. waitUntil — ctx.waitUntil() between steps
	// -----------------------------------------------------------------------

	describe('waitUntil — ctx.waitUntil() between steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'WaitUntil',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 42 };
		});

		await ctx.waitUntil(new Date(Date.now() + 5000));

		const result = await ctx.step({ name: 'process' }, async () => {
			return { doubled: data.value * 2 };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph has a sleep node for waitUntil', () => {
			const result = transpiler.compile(source);
			const sleepNodes = result.graph.nodes.filter((n) => n.type === 'sleep');
			expect(sleepNodes).toHaveLength(1);
		});

		it('sleep node has waitUntilExpr instead of sleepMs', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode?.config.sleepMs).toBeUndefined();
			expect(sleepNode?.config.waitUntilExpr).toBe('new Date(Date.now() + 5000)');
		});

		it('edges route through sleep: fetch → sleep → process', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: sleepNode!.id }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processId }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// 14. Sleep with multiple dependents — no duplicate edges
	// -----------------------------------------------------------------------

	describe('Sleep with multiple dependents — no duplicate source→sleep edges', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'SleepFanOut',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 1 };
		});
		await ctx.sleep(3000);
		const a = await ctx.step({ name: 'processA' }, async () => {
			return { result: data.value + 1 };
		});
		const b = await ctx.step({ name: 'processB' }, async () => {
			return { result: data.value + 2 };
		});
		return { a, b };
	},
});
`;

		it('does not create duplicate source→sleep edges', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			const fetchId = sha256('fetch');
			const edgesToSleep = result.graph.edges.filter(
				(e) => e.from === fetchId && e.to === sleepNode!.id,
			);
			expect(edgesToSleep).toHaveLength(1);
		});

		it('sleep fans out to both dependents', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			const processAId = sha256('processA');
			const processBId = sha256('processB');

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processAId }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processBId }),
			);
		});

		it('total edge count is exactly 4 (trigger→fetch, fetch→sleep, sleep→A, sleep→B)', () => {
			const result = transpiler.compile(source);
			expect(result.graph.edges).toHaveLength(4);
		});
	});

	// 10. Trigger extraction — AST-based webhook parsing
	// -----------------------------------------------------------------------

	describe('Trigger extraction', () => {
		const transpiler = new TranspilerService();

		it('extracts a single webhook trigger', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Webhook',
	triggers: [webhook('/echo', { method: 'POST', responseMode: 'respondWithNode' })],
	async run(ctx) {
		const result = await ctx.step({ name: 'echo' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toHaveLength(1);
			expect(result.triggers[0]).toEqual({
				type: 'webhook',
				config: { path: '/echo', method: 'POST', responseMode: 'respondWithNode' },
			});
		});

		it('extracts webhook with default config', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'DefaultWebhook',
	triggers: [webhook('/hook')],
	async run(ctx) {
		const result = await ctx.step({ name: 'handle' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toHaveLength(1);
			expect(result.triggers[0]).toEqual({
				type: 'webhook',
				config: { path: '/hook', method: 'POST', responseMode: 'lastNode' },
			});
		});

		it('extracts multiple webhook triggers', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Multi',
	triggers: [
		webhook('/first', { method: 'POST' }),
		webhook('/second', { method: 'GET', responseMode: 'respondImmediately' }),
	],
	async run(ctx) {
		const result = await ctx.step({ name: 'handle' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toHaveLength(2);
			expect(result.triggers[0].config).toMatchObject({ path: '/first', method: 'POST' });
			expect(result.triggers[1].config).toMatchObject({ path: '/second', method: 'GET' });
		});

		it('returns empty triggers when no triggers array', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoTriggers',
	async run(ctx) {
		const result = await ctx.step({ name: 'work' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toEqual([]);
		});

		it('returns empty triggers for empty triggers array', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'EmptyTriggers',
	triggers: [],
	async run(ctx) {
		const result = await ctx.step({ name: 'work' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toEqual([]);
		});

		it('extracts webhook schema as JSON Schema', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'WithSchema',
	triggers: [webhook('/test', {
		method: 'POST',
		schema: {
			body: z.object({
				message: z.string(),
				count: z.number().min(1).max(100).optional(),
			}),
			query: z.object({
				format: z.enum(['json', 'xml']),
			}),
		},
	})],
	async run(ctx) {
		const result = await ctx.step({ name: 'echo' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.triggers).toHaveLength(1);
			const schema = (result.triggers[0].config as Record<string, unknown>).schema as Record<
				string,
				unknown
			>;
			expect(schema).toBeDefined();
			expect(schema.body).toEqual({
				type: 'object',
				properties: {
					message: { type: 'string' },
					count: { type: 'number', minimum: 1, maximum: 100 },
				},
				required: ['message'],
			});
			expect(schema.query).toEqual({
				type: 'object',
				properties: {
					format: { type: 'string', enum: ['json', 'xml'] },
				},
				required: ['format'],
			});
		});

		it('labels trigger node as webhook when webhook trigger is present', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'WebhookGraph',
	triggers: [webhook('/test')],
	async run(ctx) {
		const result = await ctx.step({ name: 'handle' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			const triggerNode = result.graph.nodes.find((n) => n.type === 'trigger');
			expect(triggerNode).toBeDefined();
			expect(triggerNode?.name).toContain('Webhook');
		});
	});

	// -----------------------------------------------------------------------
	// 11. Type checking — validates workflow source against SDK types
	// -----------------------------------------------------------------------

	describe('Type checking', () => {
		const transpiler = new TranspilerService();

		it('reports error for webhook with non-string path', () => {
			const source = `
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'BadWebhook',
	triggers: [webhook(123)],
	async run(ctx) {
		const result = await ctx.step({ name: 'work' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.line !== undefined)).toBe(true);
		});

		it('reports error for missing run method type mismatch', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'BadRun',
	run: 'not a function',
});
`;
			const result = transpiler.compile(source);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('valid workflow produces no type errors', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Valid',
	async run(ctx) {
		const result = await ctx.step({ name: 'work' }, async () => {
			return { ok: true };
		});
		return result;
	},
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});
	});
});

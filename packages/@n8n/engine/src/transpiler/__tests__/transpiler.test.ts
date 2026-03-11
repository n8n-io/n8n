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
			expect(result.errors[0].message).toContain('run()');
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
});

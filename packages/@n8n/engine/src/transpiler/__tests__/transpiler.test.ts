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
	// 3. Sequential-by-default — 2 independent steps chain sequentially
	// -----------------------------------------------------------------------

	describe('Sequential-by-default — independent steps chain A→B', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sequential',
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

		it('steps chain sequentially: trigger→A→B', () => {
			const result = transpiler.compile(source);
			const stepAId = sha256('step-a');
			const stepBId = sha256('step-b');

			// step-a connects from trigger
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: stepAId }),
			);

			// step-b connects from step-a (sequential, not from trigger)
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: stepAId, to: stepBId }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// 3b. Parallel — actual Promise.all with 2 steps
	// -----------------------------------------------------------------------

	describe('Parallel — Promise.all with independent steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Parallel',
	async run(ctx) {
		const [a, b] = await Promise.all([
			ctx.step({ name: 'step-a' }, async () => {
				return { fromA: true };
			}),
			ctx.step({ name: 'step-b' }, async () => {
				return { fromB: true };
			}),
		]);
		return { a, b };
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('both steps connect from trigger (parallel fan-out)', () => {
			const result = transpiler.compile(source);
			const stepAId = sha256('step-a');
			const stepBId = sha256('step-b');

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: stepAId }),
			);
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: stepBId }),
			);
		});

		it('no sequential edge between step-a and step-b', () => {
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
	// 3c. Batch detection — ctx.batch() creates batch node
	// -----------------------------------------------------------------------

	describe('Batch detection — ctx.batch() creates batch node', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'BatchWorkflow',
	async run(ctx) {
		const items = await ctx.step({ name: 'fetch' }, async () => {
			return [1, 2, 3];
		});
		const results = await ctx.batch(
			{ name: 'process', onItemFailure: 'continue' },
			items,
			async (item, index) => {
				return { processed: item, index };
			},
		);
		return results;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('creates a batch type node for the 3-arg step call', () => {
			const result = transpiler.compile(source);
			const batchNodes = result.graph.nodes.filter((n) => n.type === 'batch');
			expect(batchNodes).toHaveLength(1);
			expect(batchNodes[0].name).toBe('process');
		});

		it('batch node has onItemFailure config', () => {
			const result = transpiler.compile(source);
			const batchNode = result.graph.nodes.find((n) => n.type === 'batch');
			expect(batchNode?.config.onItemFailure).toBe('continue');
		});

		it('edges chain sequentially: trigger→fetch→process', () => {
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

	// -----------------------------------------------------------------------
	// 9b. Approval steps — stepType: 'approval'
	// -----------------------------------------------------------------------

	describe('Approval steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';
export default defineWorkflow({
	name: 'Approval Test',
	async run(ctx) {
		const prep = await ctx.step({ name: 'prepare' }, async () => {
			return { amount: 5000 };
		});
		const approval = await ctx.approval({
			name: 'manager-approval',
		}, async () => {
			return { message: 'Approve?' };
		});
		return approval;
	},
});
`;

		it('graph node for approval step has type "approval"', () => {
			const result = transpiler.compile(source);
			const approvalNode = result.graph.nodes.find((n) => n.name === 'manager-approval');
			expect(approvalNode).toBeDefined();
			expect(approvalNode?.type).toBe('approval');
			expect(approvalNode?.config.stepType).toBe('approval');
		});

		it('approval step has a stepFunctionRef', () => {
			const result = transpiler.compile(source);
			const approvalNode = result.graph.nodes.find((n) => n.name === 'manager-approval');
			expect(approvalNode?.stepFunctionRef).toMatch(/^step_/);
		});

		it('non-approval steps still have type "step"', () => {
			const result = transpiler.compile(source);
			const prepNode = result.graph.nodes.find((n) => n.name === 'prepare');
			expect(prepNode?.type).toBe('step');
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

		it('steps after sleep chain sequentially: sleep→A→B', () => {
			const result = transpiler.compile(source);
			const sleepNode = result.graph.nodes.find((n) => n.type === 'sleep');
			expect(sleepNode).toBeDefined();

			const processAId = sha256('processA');
			const processBId = sha256('processB');

			// sleep → processA (sequential first step after sleep)
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: sleepNode!.id, to: processAId }),
			);
			// processA → processB (sequential chaining)
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: processAId, to: processBId }),
			);
		});

		it('total edge count is exactly 4 (trigger→fetch, fetch→sleep, sleep→A, A→B)', () => {
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

		it('reports warning for webhook with non-string path', () => {
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
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((e) => e.line !== undefined)).toBe(true);
		});

		it('reports warning for missing run method type mismatch', () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'BadRun',
	run: 'not a function',
});
`;
			const result = transpiler.compile(source);
			// The 'run' type mismatch prevents finding the run method, which IS an error
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

	// -----------------------------------------------------------------------
	// 12. Cross-workflow trigger — ctx.triggerWorkflow() detection
	// -----------------------------------------------------------------------

	describe('Cross-workflow trigger — ctx.triggerWorkflow()', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CrossWorkflow',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => {
			return { value: 42 };
		});

		const childResult = await ctx.triggerWorkflow({
			workflow: 'child-workflow-id',
			input: { data: data.value },
			timeout: 30000,
		});

		const result = await ctx.step({ name: 'process' }, async () => {
			return { fromChild: childResult };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('graph has a trigger-workflow node', () => {
			const result = transpiler.compile(source);
			const twNodes = result.graph.nodes.filter((n) => n.type === 'trigger-workflow');
			expect(twNodes).toHaveLength(1);
		});

		it('trigger-workflow node has correct workflow in config', () => {
			const result = transpiler.compile(source);
			const twNode = result.graph.nodes.find((n) => n.type === 'trigger-workflow');
			expect(twNode).toBeDefined();
			expect(twNode?.config.workflow).toBe('child-workflow-id');
		});

		it('trigger-workflow node has a step function ref', () => {
			const result = transpiler.compile(source);
			const twNode = result.graph.nodes.find((n) => n.type === 'trigger-workflow');
			expect(twNode).toBeDefined();
			expect(twNode?.stepFunctionRef).toBeTruthy();
			expect(result.code).toContain(`exports.${twNode!.stepFunctionRef}`);
		});

		it('edges route: fetch → trigger-workflow → process', () => {
			const result = transpiler.compile(source);
			const fetchId = sha256('fetch');
			const processId = sha256('process');
			const twNode = result.graph.nodes.find((n) => n.type === 'trigger-workflow');
			expect(twNode).toBeDefined();

			// fetch → trigger-workflow (trigger-workflow depends on data from fetch via childResult)
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: fetchId, to: twNode!.id }),
			);
			// trigger-workflow → process (process depends on childResult from trigger-workflow)
			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: twNode!.id, to: processId }),
			);
		});

		it('compiled code contains ctx.triggerWorkflow call in step function', () => {
			const result = transpiler.compile(source);
			expect(result.code).toContain('ctx.triggerWorkflow');
		});
	});

	describe('Cross-workflow trigger — standalone at start', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'TriggerAtStart',
	async run(ctx) {
		const childResult = await ctx.triggerWorkflow({
			workflow: 'other-workflow',
		});
		const result = await ctx.step({ name: 'process' }, async () => {
			return { data: childResult };
		});
		return result;
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('trigger-workflow connects from trigger node', () => {
			const result = transpiler.compile(source);
			const twNode = result.graph.nodes.find((n) => n.type === 'trigger-workflow');
			expect(twNode).toBeDefined();

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: twNode!.id }),
			);
		});

		it('process step connects from trigger-workflow', () => {
			const result = transpiler.compile(source);
			const twNode = result.graph.nodes.find((n) => n.type === 'trigger-workflow');
			const processId = sha256('process');
			expect(twNode).toBeDefined();

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: twNode!.id, to: processId }),
			);
		});
	});

	// -----------------------------------------------------------------------
	// Source map line mapping
	// -----------------------------------------------------------------------

	// -----------------------------------------------------------------------
	// Try/Catch — error handling with catch blocks
	// -----------------------------------------------------------------------

	describe('Try/Catch — error handling with catch blocks', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'TryCatch',
	async run(ctx) {
		try {
			const result = await ctx.step({ name: 'HTTP Request' }, async () => {
				const res = await fetch('https://example.com');
				if (!res.ok) throw new Error('HTTP error');
				return res.json();
			});
			return result;
		} catch (error) {
			const handled = await ctx.step({ name: 'Error Handler' }, async () => {
				return { error: true, message: error instanceof Error ? error.message : 'Unknown' };
			});
			return handled;
		}
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('extracts 2 step nodes: HTTP Request and Error Handler', () => {
			const result = transpiler.compile(source);
			const names = result.graph.nodes
				.filter((n) => n.type === 'step')
				.map((n) => n.name)
				.sort();
			expect(names).toEqual(['Error Handler', 'HTTP Request']);
		});

		it('creates error edge from try step to catch step with __error__ condition', () => {
			const result = transpiler.compile(source);
			const httpId = sha256('HTTP Request');
			const errorHandlerId = sha256('Error Handler');

			const errorEdge = result.graph.edges.find(
				(e) => e.from === httpId && e.to === errorHandlerId,
			);
			expect(errorEdge).toBeDefined();
			expect(errorEdge?.condition).toBe('__error__');
		});

		it('does not create sequential edge from try step to catch step', () => {
			const result = transpiler.compile(source);
			const httpId = sha256('HTTP Request');
			const errorHandlerId = sha256('Error Handler');

			const sequentialEdge = result.graph.edges.find(
				(e) => e.from === httpId && e.to === errorHandlerId && e.condition !== '__error__',
			);
			expect(sequentialEdge).toBeUndefined();
		});

		it('compiled catch step function includes ctx.error injection', () => {
			const result = transpiler.compile(source);
			// The error handler step should inject: const error = ctx.error;
			expect(result.code).toContain('ctx.error');
		});

		it('trigger connects to HTTP Request', () => {
			const result = transpiler.compile(source);
			const httpId = sha256('HTTP Request');

			expect(result.graph.edges).toContainEqual(
				expect.objectContaining({ from: 'trigger', to: httpId }),
			);
		});
	});

	describe('Try/Catch — multiple try steps', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'MultiTryCatch',
	async run(ctx) {
		try {
			const a = await ctx.step({ name: 'step-a' }, async () => {
				return { ok: true };
			});
			const b = await ctx.step({ name: 'step-b' }, async () => {
				return { ok: a.ok };
			});
			return b;
		} catch (err) {
			const fallback = await ctx.step({ name: 'fallback' }, async () => {
				return { error: true, msg: err instanceof Error ? err.message : 'fail' };
			});
			return fallback;
		}
	},
});
`;

		it('creates error edges from both try steps to the catch step', () => {
			const result = transpiler.compile(source);
			const stepAId = sha256('step-a');
			const stepBId = sha256('step-b');
			const fallbackId = sha256('fallback');

			const errorEdgeA = result.graph.edges.find(
				(e) => e.from === stepAId && e.to === fallbackId && e.condition === '__error__',
			);
			const errorEdgeB = result.graph.edges.find(
				(e) => e.from === stepBId && e.to === fallbackId && e.condition === '__error__',
			);

			expect(errorEdgeA).toBeDefined();
			expect(errorEdgeB).toBeDefined();
		});

		it('catch step injects the catch variable name', () => {
			const result = transpiler.compile(source);
			// The fallback step should inject: const err = ctx.error;
			expect(result.code).toContain('ctx.error');
		});
	});

	describe('Try/Catch — no catch variable', () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoCatchVar',
	async run(ctx) {
		try {
			const result = await ctx.step({ name: 'risky' }, async () => {
				return { value: 1 };
			});
			return result;
		} catch {
			const safe = await ctx.step({ name: 'safe' }, async () => {
				return { fallback: true };
			});
			return safe;
		}
	},
});
`;

		it('compiles without errors', () => {
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
		});

		it('creates error edge without catch variable injection', () => {
			const result = transpiler.compile(source);
			const riskyId = sha256('risky');
			const safeId = sha256('safe');

			const errorEdge = result.graph.edges.find(
				(e) => e.from === riskyId && e.to === safeId && e.condition === '__error__',
			);
			expect(errorEdge).toBeDefined();
		});
	});

	describe('Source map line mapping', () => {
		it('sourceMap contains a compiled-to-original line map as JSON', () => {
			const source = `import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'Test',
  async run(ctx) {
    const result = await ctx.step({ name: 'Fetch Data' }, async () => {
      const x = 1;
      const data = { value: x };
      return data;
    });
  }
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.sourceMap).not.toBeNull();

			const lineMap = JSON.parse(result.sourceMap!) as Record<string, number>;
			// The line map should be a non-empty object with numeric values
			expect(Object.keys(lineMap).length).toBeGreaterThan(0);
			for (const value of Object.values(lineMap)) {
				expect(typeof value).toBe('number');
			}
		});

		it('maps compiled step body lines back to correct original source lines', () => {
			// Source code with known line numbers.
			// Line 1: import
			// Line 2: blank
			// Line 3: export default defineWorkflow({
			// Line 4:   name: 'Test',
			// Line 5:   async run(ctx) {
			// Line 6:     const result = await ctx.step(...)
			// Line 7:       const x = 1;
			// Line 8:       const data = { value: x };
			// Line 9:       return data;
			// Line 10:    });
			// Line 11:  }
			// Line 12: });
			const source = `import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'Test',
  async run(ctx) {
    const result = await ctx.step({ name: 'Fetch Data' }, async () => {
      const x = 1;
      const data = { value: x };
      return data;
    });
  }
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.sourceMap).not.toBeNull();

			const lineMap = JSON.parse(result.sourceMap!) as Record<string, number>;

			// Find compiled lines that contain the step body code
			const compiledLines = result.code.split('\n');

			// Find the line containing "const x = 1" in compiled output
			const xLineIdx = compiledLines.findIndex((l) => l.includes('const x = 1'));
			expect(xLineIdx).toBeGreaterThanOrEqual(0);
			const xCompiledLine = xLineIdx + 1; // 1-based

			// This should map back to line 7 in the original source
			expect(lineMap[String(xCompiledLine)]).toBe(7);

			// Find the line containing "value: x" in compiled output
			const dataLineIdx = compiledLines.findIndex((l) => l.includes('value: x'));
			expect(dataLineIdx).toBeGreaterThanOrEqual(0);
			const dataCompiledLine = dataLineIdx + 1;

			// This should map back to line 8 in the original source
			expect(lineMap[String(dataCompiledLine)]).toBe(8);

			// Find the line containing "return data" in compiled output
			const returnLineIdx = compiledLines.findIndex((l) => l.includes('return data'));
			expect(returnLineIdx).toBeGreaterThanOrEqual(0);
			const returnCompiledLine = returnLineIdx + 1;

			// This should map back to line 9 in the original source
			expect(lineMap[String(returnCompiledLine)]).toBe(9);
		});

		it('maps multi-step workflows correctly', () => {
			const source = `import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'Multi',
  async run(ctx) {
    const a = await ctx.step({ name: 'stepA' }, async () => {
      return { first: true };
    });
    const b = await ctx.step({ name: 'stepB' }, async () => {
      return { second: a.first };
    });
  }
});
`;
			const result = transpiler.compile(source);
			expect(result.errors).toHaveLength(0);
			expect(result.sourceMap).not.toBeNull();

			const lineMap = JSON.parse(result.sourceMap!) as Record<string, number>;
			const compiledLines = result.code.split('\n');

			// "first: true" is on line 7 in source
			const firstLineIdx = compiledLines.findIndex((l) => l.includes('first: true'));
			expect(firstLineIdx).toBeGreaterThanOrEqual(0);
			expect(lineMap[String(firstLineIdx + 1)]).toBe(7);

			// "second: a.first" is on line 10 in source
			const secondLineIdx = compiledLines.findIndex((l) => l.includes('second: a.first'));
			expect(secondLineIdx).toBeGreaterThanOrEqual(0);
			expect(lineMap[String(secondLineIdx + 1)]).toBe(10);
		});
	});
});

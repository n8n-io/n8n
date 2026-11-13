import { compile } from '../compiler/index.ts';
import { corpusCase } from './helpers.ts';

describe('canvas projection', () => {
	it.each(['01-order-approval', '07-promise-all-list', '02-loops'])('%s', async (name) => {
		const result = compile(corpusCase(name).source, { fileName: 'workflow.ts' });
		expect(result.ok).toBe(true);
		await expect(`${JSON.stringify(result.canvas, null, 2)}\n`).toMatchFileSnapshot(
			`__snapshots__/${name}.canvas.json.snap`,
		);
	});

	it('projects a sub-node whose connection type the canvas entry already has', () => {
		const source = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x' })],
	async run(ctx, trigger) {
		return await ctx.node({
			name: 'Root',
			type: 'n8n-nodes-base.noOp',
			parameters: {},
			host: 'fallback',
			subNodes: [
				{ name: 'Sub', type: 'n8n-nodes-base.noOp', parameters: {}, connection: 'main', target: 'Root' },
			],
			items: [trigger.body],
		});
	},
});
`;
		const result = compile(source);
		expect(result.diagnostics).toEqual([]);
		const sub = result.canvas?.nodes.find((n) => n.name === 'Sub');
		expect(sub).toBeDefined();
		expect(result.canvas?.connections[sub?.name ?? ''].main[0]).toEqual([
			{ node: 'Root', type: 'main', index: 0 },
		]);
	});

	it('gives each step node its step id, and marks glue as not durable', () => {
		const result = compile(corpusCase('01-order-approval').source);
		const nodes = result.canvas?.nodes ?? [];
		const ids = nodes.map((n) => n.id);
		for (const step of result.manifest?.steps ?? []) expect(ids).toContain(step.id);
		const loop = nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
		expect(loop).toBeDefined();
		const charge = nodes.find((n) => n.id === 'Charge');
		expect(charge?.onError).toBe('continueErrorOutput');
		expect(result.canvas?.connections.Charge.main[1]).toEqual([
			{ node: 'Payment failed', type: 'main', index: 0 },
		]);
	});

	it('projects a schedule trigger as a Schedule Trigger node', () => {
		const result = compile(corpusCase('22-schedule').source);
		const trigger = result.canvas?.nodes.find((n) => n.id === 'trigger');
		expect(trigger?.type).toBe('n8n-nodes-base.scheduleTrigger');
		expect(trigger?.parameters).toEqual({
			rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 15 }] },
		});
	});

	it('projects a cron schedule to the cronExpression interval', () => {
		const source = corpusCase('22-schedule').source.replace(
			/schedule\(\{[\s\S]*?\}\)/,
			"schedule({ cron: '0 9 * * 1-5', timezone: 'Europe/Berlin' })",
		);
		const trigger = compile(source).canvas?.nodes.find((n) => n.id === 'trigger');
		expect(trigger?.parameters).toEqual({
			rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * 1-5' }] },
		});
	});
});

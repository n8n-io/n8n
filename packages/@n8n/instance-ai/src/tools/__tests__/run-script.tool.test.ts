import { wrapUntrustedData } from '@n8n/agents';

import type { InstanceAiContext } from '../../types';
import { runScript } from '../run-script.tool';

function contextWithItems(count: number) {
	const items = Array.from({ length: count }, (_, i) => ({ id: i, amount: i === 137 ? -1 : 10 }));
	const getNodeOutput = vi.fn(
		async (_id: string, nodeName: string, options?: { startIndex?: number; maxItems?: number }) => {
			const from = options?.startIndex ?? 0;
			const page = items.slice(from, from + (options?.maxItems ?? 10));
			return {
				nodeName,
				outputs: [
					{
						index: 0,
						totalItems: count,
						items: page.map((item) =>
							wrapUntrustedData(JSON.stringify(item, null, 2), 'execution-output', 'x'),
						),
					},
				],
				totalItems: count,
				returned: { from, to: from + page.length },
			};
		},
	);
	const context = { executionService: { getNodeOutput } } as unknown as InstanceAiContext;
	return { context, getNodeOutput };
}

describe('runScript', () => {
	it('reads all pages and returns only the script result', async () => {
		const { context, getNodeOutput } = contextWithItems(400);

		const output = await runScript(
			context,
			"const r = await n8n.executions.nodeItems('1', 'Orders');\n" +
				'return { total: r.totalItems, bad: r.outputs[0].items.filter((i) => i.amount < 0) };',
		);

		expect(getNodeOutput).toHaveBeenCalledTimes(8);
		expect(output.result).toContain('"total": 400');
		expect(output.result).toContain('"id": 137');
		expect(output.result).not.toContain('"id": 5,');
	});

	it('reports a script error', async () => {
		const { context } = contextWithItems(1);
		const output = await runScript(context, 'return nope.x;');
		expect(output.error).toContain('ReferenceError');
	});

	it('stops a script that makes too many calls', async () => {
		const { context } = contextWithItems(1);
		const output = await runScript(
			context,
			"for (let i = 0; i < 100; i++) await n8n.executions.nodeItems('1', 'Orders');",
		);
		expect(output.error).toContain('more than 50 n8n calls');
	});

	it('cuts a result that is too large', async () => {
		const { context } = contextWithItems(1);
		const output = await runScript(context, "return 'x'.repeat(50000);");
		expect(output.truncated).toBeDefined();
	});
});

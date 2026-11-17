/**
 * A parameter that takes no expression (`noDataExpression`): the host loads the node as
 * n8n's `Workflow` constructor does, so the parameter loses the `=` at its start before
 * the node reads it.
 */
import { NodeStepRunner } from '../node-step';

async function htmlOf(html: string): Promise<unknown> {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
	const out = await runner.run(
		{
			name: 'HTML',
			type: 'n8n-nodes-base.html',
			typeVersion: 1.2,
			parameters: { operation: 'generateHtmlTemplate', html },
			inputs: [[{ name: 'Ada' }]],
			subNodes: [],
			allOutputs: false,
		},
		{ step: 'HTML', key: 'k' },
	);
	return out[0]?.html;
}

describe('a parameter that takes no expression', () => {
	it('loses one `=`, and n8n evaluates the text that stays when it has a second `=`', async () => {
		// Without the rule, n8n evaluates `==<p>a</p>` to `=<p>a</p>`.
		expect(await htmlOf('==<p>a</p>')).toBe('<p>a</p>');
	});

	it('gives the node the text after the `=`, and the node evaluates each `{{ }}` of it', async () => {
		expect(await htmlOf('=<p>{{ $json.name }}</p>')).toBe('<p>Ada</p>');
	});
});

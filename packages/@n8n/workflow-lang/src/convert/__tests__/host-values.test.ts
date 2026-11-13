/**
 * A node that must stay compiled (here Respond to Webhook) with an expression
 * that does not translate: an evaluate step in the fallback host gives the v1
 * value for each input item, and the node uses that value.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const workflow = (body: string) => ({
	name: 'Respond',
	nodes: [
		{
			name: 'Hook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { path: 'a', responseMode: 'responseNode' },
		},
		{
			name: 'Respond',
			type: 'n8n-nodes-base.respondToWebhook',
			typeVersion: 1.1,
			position: [200, 0],
			parameters: { respondWith: 'json', responseBody: body },
		},
	],
	connections: { Hook: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] } },
});

describe('expressions that the host evaluates', () => {
	it('keeps an object literal compiled', () => {
		const out = convertWorkflow(workflow('={{\n{\n  ok: true,\n  id: $json.body.id\n}\n}}'));
		expect(out.ok).toBe(true);
		expect(out.source).not.toContain('n8n-compiled.evaluate');
	});

	it('responds with the value of the evaluate step', async () => {
		// `$jmespath` has no translation, so n8n evaluates it in the host.
		const expression = "={{ { day: $jmespath($json, 'body.day'), id: $json.body.id } }}";
		const converted = convertWorkflow(workflow(expression));
		expect(converted.ok).toBe(true);
		expect(converted.source).toContain("type: 'n8n-compiled.evaluate'");
		const out = await runReference(converted.source, {
			trigger: { body: { id: 7 } },
			now: 0,
			seed: 1,
			effects: { 'Respond (values)': [[{ p0: { day: '2026-11-12', id: 7 } }]] },
		});
		expect(out.status).toBe('ok');
		const evaluate = out.effects.find((e) => e.step === 'Respond (values)');
		expect(evaluate?.args).toMatchObject({
			parameters: { node: 'Respond', values: { p0: expression } },
		});
		const respond = out.effects.find((e) => e.kind === 'respond');
		expect(respond?.args).toMatchObject({ body: { day: '2026-11-12', id: 7 } });
	});
});

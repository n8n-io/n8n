import type { IDataObject } from '../../../types/base';

import { workflow } from '../../../workflow-builder';
import { node, trigger } from '../../node-builders/node-builder';

/**
 * SDK `output` mocks are raw `$json` objects. An item wrapped in the runtime
 * envelope `{ json: { ... } }` makes every downstream `$json.field` resolve empty,
 * so verification passes on fields that never resolved.
 */
describe('mockOutputEnvelopeValidator', () => {
	function build(output: IDataObject[]) {
		return workflow('wf-1', 'Mocks').add(
			trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }).to(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.3,
					config: { name: 'Fetch Orders', parameters: { url: 'https://example.com' }, output },
				}),
			),
		);
	}

	const envelopeWarnings = (output: IDataObject[]) =>
		build(output)
			.validate()
			.warnings.filter((w) => w.code === 'MOCK_OUTPUT_JSON_ENVELOPE');

	it('warns when every mock item is wrapped in a json envelope', () => {
		const warnings = envelopeWarnings([
			{ json: { orderId: 'ord_1' } },
			{ json: { orderId: 'ord_2' } },
		]);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].nodeName).toBe('Fetch Orders');
		expect(warnings[0].message).toContain("output: [{ orderId: 'ord_1' }]");
	});

	it('does not warn when a downstream expression reads $json.json', () => {
		const wf = workflow('wf-1', 'Mocks').add(
			trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }).to(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.3,
					config: {
						name: 'Fetch Orders',
						parameters: { url: 'https://example.com' },
						output: [{ json: { orderId: 'ord_1' } }],
					},
				}).to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Read Nested',
							parameters: { value: '={{ $json.json.orderId }}' },
						},
					}),
				),
			),
		);

		expect(
			wf.validate().warnings.filter((w) => w.code === 'MOCK_OUTPUT_JSON_ENVELOPE'),
		).toHaveLength(0);
	});

	it('does not warn for raw mock items', () => {
		expect(envelopeWarnings([{ orderId: 'ord_1' }])).toHaveLength(0);
	});

	it('does not warn when an item has fields next to json', () => {
		expect(envelopeWarnings([{ json: { a: 1 }, total: 2 }])).toHaveLength(0);
	});
});

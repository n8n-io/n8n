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

	it('warns on a JSON round trip when fromJSON gets the declared outputs back', () => {
		const authored = build([{ json: { orderId: 'ord_1' } }]);
		const declaredOutputs = authored.generatePinData().toJSON().pinData;

		const warnings = workflow
			.fromJSON(authored.toJSON(), { declaredOutputs })
			.validate()
			.warnings.filter((w) => w.code === 'MOCK_OUTPUT_JSON_ENVELOPE');

		expect(warnings).toHaveLength(1);
		expect(warnings[0].nodeName).toBe('Fetch Orders');
	});

	function readerWorkflow(readerParameters: IDataObject, readerDownstream: boolean) {
		const reader = node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { name: 'Reader', parameters: readerParameters },
		});
		const mocked = node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				name: 'Fetch Orders',
				parameters: { url: 'https://example.com' },
				output: [{ json: { orderId: 'ord_1' } }],
			},
		});
		const start = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		if (readerDownstream) return workflow('wf-1', 'Mocks').add(start.to(mocked.to(reader)));
		const other = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Other Start' },
		});
		return workflow('wf-1', 'Mocks').add(start.to(mocked)).add(other.to(reader));
	}

	const warningsOf = (wf: ReturnType<typeof readerWorkflow>) =>
		wf.validate().warnings.filter((w) => w.code === 'MOCK_OUTPUT_JSON_ENVELOPE');

	it('still warns when a downstream field only starts with json', () => {
		const wf = readerWorkflow({ value: '={{ $json.jsonField }}' }, true);

		expect(warningsOf(wf)).toHaveLength(1);
	});

	it('still warns when only an unrelated branch reads $json.json', () => {
		const wf = readerWorkflow({ value: '={{ $json.json.orderId }}' }, false);

		expect(warningsOf(wf)).toHaveLength(1);
	});

	it('imports a node named like an object prototype key without a declared output', () => {
		const wf = workflow('wf-1', 'Mocks').add(
			trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'constructor' },
			}),
		);

		expect(() => workflow.fromJSON(wf.toJSON(), { declaredOutputs: {} }).validate()).not.toThrow();
	});
});

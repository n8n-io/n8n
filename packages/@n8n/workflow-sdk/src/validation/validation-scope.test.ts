import { validateWorkflow } from './validate-workflow';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../workflow-builder/node-builders/node-builder';

describe('validation scope', () => {
	it('distinguishes node configuration from workflow constraints without changing severity', () => {
		const wf = workflow('test', 'Scope')
			.add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { id: 'shared', name: 'Start' },
				}),
			)
			.to(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						id: 'shared',
						name: 'Request',
						parameters: {
							url: 'https://example.test',
							contentType: 'json',
							jsonBody: '<soap:Envelope />',
							headerParameters: { parameters: [{ name: 'apikey', value: 'example-key' }] },
						},
					},
				}),
			);
		const result = wf.validate();
		expect(result.errors).toContainEqual(
			expect.objectContaining({
				code: 'DUPLICATE_NODE_ID',
				scope: 'workflow',
				severity: 'error',
			}),
		);
		expect(result.errors).toContainEqual(
			expect.objectContaining({
				code: 'INVALID_PARAMETER',
				scope: 'node',
				severity: 'error',
				parameterName: 'jsonBody',
			}),
		);
		expect(result.warnings).toContainEqual(
			expect.objectContaining({
				code: 'HARDCODED_CREDENTIALS',
				scope: 'node',
				severity: 'warning',
				parameterPath: 'headerParameters.parameters[apikey]',
			}),
		);
	});
	it('keeps an invalid Switch output as a workflow constraint', () => {
		const result = validateWorkflow({
			name: 'Invalid output',
			nodes: [
				{
					id: 'switch',
					name: 'Route',
					type: 'n8n-nodes-base.switch',
					typeVersion: 3.2,
					position: [0, 0],
					parameters: { mode: 'rules', rules: { values: [] }, options: {} },
				},
				{
					id: 'target',
					name: 'Target',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
			connections: { Route: { main: [[{ node: 'Target', type: 'main', index: 0 }]] } },
		});
		expect(result.warnings).toContainEqual(
			expect.objectContaining({
				code: 'SWITCH_FALLBACK_OUTPUT_DISABLED',
				scope: 'workflow',
				severity: 'warning',
			}),
		);
	});
});

import type { INodeTypes } from 'n8n-workflow';

import { validateWorkflow } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger, merge } from '../workflow-builder/node-builders/node-builder';

describe('input index validation', () => {
	const mockNodeTypesProvider: INodeTypes = {
		getByNameAndVersion: (type: string) => {
			if (type === 'n8n-nodes-base.aggregate') {
				return { description: { inputs: ['main'] } };
			}
			if (type === 'n8n-nodes-base.set') {
				return { description: { inputs: ['main'] } };
			}
			if (type === 'n8n-nodes-base.merge') {
				// Merge uses expression-based inputs
				return { description: { inputs: '={{$parameter.numberInputs}}' } };
			}
			if (type === 'n8n-nodes-base.manualTrigger') {
				return { description: { inputs: [] } };
			}
			// Default single input
			return { description: { inputs: ['main'] } };
		},
		getByName: (type: string) => mockNodeTypesProvider.getByNameAndVersion(type),
		getKnownTypes: () => ({}),
	} as INodeTypes;

	it('warns when connecting to invalid input index on single-input node', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const aggregate = node({ type: 'n8n-nodes-base.aggregate', version: 1, config: {} });

		// Invalid! Aggregate has only input 0
		const wf = workflow('test-id', 'Test').add(myTrigger.to(aggregate.input(1)));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings).toContainEqual(
			expect.objectContaining({ code: 'INVALID_INPUT_INDEX' }),
		);
	});

	it('does not warn for valid input index', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const aggregate = node({ type: 'n8n-nodes-base.aggregate', version: 1, config: {} });

		// Valid - input 0 exists
		const wf = workflow('test-id', 'Test').add(myTrigger.to(aggregate.input(0)));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'INVALID_INPUT_INDEX')).toHaveLength(0);
	});

	it('skips validation when no provider given (backward compatible)', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const aggregate = node({ type: 'n8n-nodes-base.aggregate', version: 1, config: {} });

		// Would be invalid, but no provider
		const wf = workflow('test-id', 'Test').add(myTrigger.to(aggregate.input(5)));

		const result = validateWorkflow(wf); // No provider

		expect(result.warnings.filter((w) => w.code === 'INVALID_INPUT_INDEX')).toHaveLength(0);
	});

	it('skips validation for dynamic input nodes like Merge', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const mergeNode = merge({ version: 3 });

		// Dynamic inputs - can't validate statically
		const wf = workflow('test-id', 'Test').add(myTrigger.to(mergeNode.input(5)));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'INVALID_INPUT_INDEX')).toHaveLength(0);
	});

	it('reports warning with node name and input index in message', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const aggregate = node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: { name: 'My Aggregate' },
		});

		const wf = workflow('test-id', 'Test').add(myTrigger.to(aggregate.input(2)));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		const warning = result.warnings.find((w) => w.code === 'INVALID_INPUT_INDEX');
		expect(warning).toBeDefined();
		expect(warning?.nodeName).toBe('My Aggregate');
		expect(warning?.message).toContain('input index 2');
		expect(warning?.message).toContain('only has 1 input');
	});

	it('warns for multiple invalid inputs to same node', () => {
		const trigger1 = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Trigger 1' },
		});
		const trigger2 = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Trigger 2' },
		});
		const aggregate = node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: { name: 'Aggregate' },
		});

		const wf = workflow('test-id', 'Test')
			.add(trigger1.to(aggregate.input(1)))
			.add(trigger2.to(aggregate.input(2)));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		const invalidInputWarnings = result.warnings.filter((w) => w.code === 'INVALID_INPUT_INDEX');
		expect(invalidInputWarnings.length).toBe(2);
	});
});

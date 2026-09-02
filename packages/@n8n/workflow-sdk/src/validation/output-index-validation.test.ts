import type { INodeTypes } from 'n8n-workflow';

import type { OnError, WorkflowJSON } from '../types/base';
import { validateWorkflow } from '../validation';

describe('output index validation', () => {
	const mockNodeTypesProvider: INodeTypes = {
		getByNameAndVersion: (type: string) => {
			if (type === 'n8n-nodes-base.if') {
				return { description: { outputs: ['main', 'main'] } };
			}
			if (type === 'n8n-nodes-base.switch') {
				// Switch uses expression-based outputs
				return { description: { outputs: '={{$parameter.rules}}' } };
			}
			if (type === 'n8n-nodes-base.manualTrigger') {
				return { description: { outputs: ['main'] } };
			}
			// Default single main output (set, dataTable, gmail, ...)
			return { description: { outputs: ['main'] } };
		},
		getByName: (type: string) => mockNodeTypesProvider.getByNameAndVersion(type),
		getKnownTypes: () => ({}),
	} as INodeTypes;

	function workflowJson(
		sourceNode: { type: string; onError?: OnError },
		sourceMain: WorkflowJSON['connections'][string]['main'],
	): WorkflowJSON {
		return {
			id: 'wf-1',
			name: 'Output index test',
			nodes: [
				{
					id: 'n0',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'n1',
					name: 'Source',
					type: sourceNode.type,
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
					...(sourceNode.onError ? { onError: sourceNode.onError } : {}),
				},
				{
					id: 'n2',
					name: 'Target',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				Start: { main: [[{ node: 'Source', type: 'main', index: 0 }]] },
				Source: { main: sourceMain },
			},
		};
	}

	it('warns when a single-output node has a connection from a nonexistent output index', () => {
		// INS-425 regression: error edge folded onto main[1] of a node without
		// onError: 'continueErrorOutput' — that output port does not exist.
		const json = workflowJson({ type: 'n8n-nodes-base.set' }, [
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);

		const result = validateWorkflow(json, { nodeTypesProvider: mockNodeTypesProvider });

		const warnings = result.warnings.filter((w) => w.code === 'INVALID_OUTPUT_INDEX');
		expect(warnings).toHaveLength(1);
		expect(warnings[0].nodeName).toBe('Source');
		expect(warnings[0].message).toContain('output index 1');
	});

	it('does not warn when main[1] is the error pin of an onError node', () => {
		const json = workflowJson({ type: 'n8n-nodes-base.set', onError: 'continueErrorOutput' }, [
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);

		const result = validateWorkflow(json, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'INVALID_OUTPUT_INDEX')).toHaveLength(0);
	});

	it('warns when the output index exceeds even the error pin', () => {
		const json = workflowJson({ type: 'n8n-nodes-base.set', onError: 'continueErrorOutput' }, [
			[],
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);

		const result = validateWorkflow(json, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'INVALID_OUTPUT_INDEX')).toHaveLength(1);
	});

	it('accepts both natural outputs of an IF node and warns beyond them', () => {
		const valid = workflowJson({ type: 'n8n-nodes-base.if' }, [
			[{ node: 'Target', type: 'main', index: 0 }],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);
		expect(
			validateWorkflow(valid, { nodeTypesProvider: mockNodeTypesProvider }).warnings.filter(
				(w) => w.code === 'INVALID_OUTPUT_INDEX',
			),
		).toHaveLength(0);

		const invalid = workflowJson({ type: 'n8n-nodes-base.if' }, [
			[],
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);
		expect(
			validateWorkflow(invalid, { nodeTypesProvider: mockNodeTypesProvider }).warnings.filter(
				(w) => w.code === 'INVALID_OUTPUT_INDEX',
			),
		).toHaveLength(1);
	});

	it('skips nodes with expression-based (dynamic) outputs', () => {
		const json = workflowJson({ type: 'n8n-nodes-base.switch' }, [
			[],
			[],
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);

		const result = validateWorkflow(json, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'INVALID_OUTPUT_INDEX')).toHaveLength(0);
	});

	it('skips validation when no provider is given (backward compatible)', () => {
		const json = workflowJson({ type: 'n8n-nodes-base.set' }, [
			[],
			[{ node: 'Target', type: 'main', index: 0 }],
		]);

		const result = validateWorkflow(json);

		expect(result.warnings.filter((w) => w.code === 'INVALID_OUTPUT_INDEX')).toHaveLength(0);
	});
});

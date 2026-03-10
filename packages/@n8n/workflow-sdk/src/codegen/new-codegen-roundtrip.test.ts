/**
 * Roundtrip tests using the NEW codegen implementation.
 * This tests if the new codegen can replace the old one.
 */
import { describe, it, expect } from '@jest/globals';

import { generateWorkflowCode } from './index';
import { parseWorkflowCode } from './parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

describe('new codegen roundtrip', () => {
	it('simple linear chain roundtrip', () => {
		const originalJson: WorkflowJSON = {
			id: 'test-linear',
			name: 'Linear Chain',
			nodes: [
				{
					id: 'node-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					id: 'node-2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://example.com' },
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify node count
		expect(parsedJson.nodes).toHaveLength(2);

		// Verify connection preserved
		expect(parsedJson.connections['Manual Trigger']).toBeDefined();
		expect(parsedJson.connections['Manual Trigger'].main[0]![0].node).toBe('HTTP Request');
	});

	it('IF branch roundtrip', () => {
		const originalJson: WorkflowJSON = {
			id: 'test-if',
			name: 'IF Branch',
			nodes: [
				{
					id: 'node-1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					id: 'node-2',
					name: 'IF',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [200, 0],
				},
				{
					id: 'node-3',
					name: 'True Branch',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, -100],
				},
				{
					id: 'node-4',
					name: 'False Branch',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [400, 100],
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'IF', type: 'main', index: 0 }]],
				},
				IF: {
					main: [
						[{ node: 'True Branch', type: 'main', index: 0 }],
						[{ node: 'False Branch', type: 'main', index: 0 }],
					],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify node count
		expect(parsedJson.nodes).toHaveLength(4);

		// Verify IF connections to branches
		expect(parsedJson.connections['IF']).toBeDefined();
		expect(parsedJson.connections['IF'].main[0]![0].node).toBe('True Branch');
		expect(parsedJson.connections['IF'].main[1]![0].node).toBe('False Branch');
	});

	it('merge pattern roundtrip', () => {
		const originalJson: WorkflowJSON = {
			id: 'test-merge',
			name: 'Merge Pattern',
			nodes: [
				{
					id: 'node-1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					id: 'node-2',
					name: 'Branch A',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, -100],
				},
				{
					id: 'node-3',
					name: 'Branch B',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 100],
				},
				{
					id: 'node-4',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					position: [400, 0],
					parameters: { numberInputs: 2 },
				},
			],
			connections: {
				Trigger: {
					main: [
						[
							{ node: 'Branch A', type: 'main', index: 0 },
							{ node: 'Branch B', type: 'main', index: 0 },
						],
					],
				},
				'Branch A': {
					main: [[{ node: 'Merge', type: 'main', index: 0 }]],
				},
				'Branch B': {
					main: [[{ node: 'Merge', type: 'main', index: 1 }]],
				},
			},
		};

		const code = generateWorkflowCode(originalJson);
		const parsedJson = parseWorkflowCode(code);

		// Verify node count
		expect(parsedJson.nodes).toHaveLength(4);

		// Verify merge connections
		expect(parsedJson.connections['Branch A']).toBeDefined();
		expect(parsedJson.connections['Branch A'].main[0]![0].node).toBe('Merge');
		expect(parsedJson.connections['Branch B']).toBeDefined();
		expect(parsedJson.connections['Branch B'].main[0]![0].node).toBe('Merge');

		// Verify fan-out: Trigger should connect to BOTH Branch A and Branch B
		expect(parsedJson.connections['Trigger']).toBeDefined();
		const triggerOutputs = parsedJson.connections['Trigger'].main[0]!;
		expect(triggerOutputs).toHaveLength(2);
		const targetNames = triggerOutputs.map((c: { node: string }) => c.node).sort();
		expect(targetNames).toEqual(['Branch A', 'Branch B']);
	});
});

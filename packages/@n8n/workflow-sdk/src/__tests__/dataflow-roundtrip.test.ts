import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, it, expect } from '@jest/globals';

import { generateDataFlowWorkflowCode } from '../codegen/dataflow/index';
import { parseDataFlowCode } from '../codegen/dataflow/dataflow-parser';
import type { WorkflowJSON } from '../types/base';

/**
 * Normalize a WorkflowJSON for comparison.
 * Strips fields that are regenerated (id, position, webhookId, etc.)
 * and normalizes connections.
 */
function normalizeForComparison(json: WorkflowJSON): {
	name: string;
	nodes: Array<{
		type: string;
		name: string;
		parameters: Record<string, unknown>;
		typeVersion: number;
		credentials?: Record<string, unknown>;
		onError?: string;
	}>;
	connections: Record<string, unknown>;
} {
	const normalizedNodes = json.nodes
		.filter((n) => !n.type.includes('stickyNote'))
		.map((n) => {
			const node: {
				type: string;
				name: string;
				parameters: Record<string, unknown>;
				typeVersion: number;
				credentials?: Record<string, unknown>;
				onError?: string;
			} = {
				type: n.type,
				name: n.name ?? '',
				parameters: (n.parameters ?? {}) as Record<string, unknown>,
				typeVersion: n.typeVersion ?? 1,
			};
			if (n.credentials) {
				node.credentials = n.credentials as Record<string, unknown>;
			}
			if (n.onError) {
				node.onError = n.onError;
			}
			return node;
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	// Normalize connections: filter out empty arrays, sort connection lists
	const normalizedConnections: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(json.connections)) {
		if (!value || typeof value !== 'object') continue;
		const nodeConnections: Record<string, unknown> = {};
		for (const [connType, outputs] of Object.entries(value as Record<string, unknown>)) {
			if (!Array.isArray(outputs)) continue;
			const filteredOutputs = outputs
				.map((output: unknown) => {
					if (!Array.isArray(output)) return [];
					return (output as Array<{ node: string; type: string; index: number }>)
						.filter((c) => c && c.node)
						.map((c) => ({
							node: c.node,
							type: c.type,
							index: c.index,
						}));
				})
				.filter((output: unknown[]) => output.length > 0);
			if (filteredOutputs.length > 0) {
				nodeConnections[connType] = filteredOutputs;
			}
		}
		if (Object.keys(nodeConnections).length > 0) {
			normalizedConnections[key] = nodeConnections;
		}
	}

	return {
		name: json.name ?? '',
		nodes: normalizedNodes,
		connections: normalizedConnections,
	};
}

function loadTemplate(relativePath: string): WorkflowJSON {
	const fullPath = resolve(
		__dirname,
		'../../../../frontend/editor-ui/src/features/workflows/templates/utils/samples',
		relativePath,
	);
	return JSON.parse(readFileSync(fullPath, 'utf-8')) as WorkflowJSON;
}

describe('dataflow round-trip', () => {
	describe('simple chain', () => {
		it('round-trips ManualTrigger → HTTP Request', () => {
			const original: WorkflowJSON = {
				name: 'Simple Chain',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
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

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			const normOriginal = normalizeForComparison(original);
			const normParsed = normalizeForComparison(parsed);

			expect(normParsed.name).toBe(normOriginal.name);
			expect(normParsed.nodes).toHaveLength(normOriginal.nodes.length);

			// Verify node types match
			const origTypes = normOriginal.nodes.map((n) => n.type).sort();
			const parsedTypes = normParsed.nodes.map((n) => n.type).sort();
			expect(parsedTypes).toEqual(origTypes);

			// Verify connection exists: trigger → HTTP
			const triggerName = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.manualTrigger')!
				.name!;
			const httpName = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!.name!;
			expect(parsed.connections[triggerName]).toBeDefined();
			expect(parsed.connections[triggerName].main[0]).toEqual(
				expect.arrayContaining([expect.objectContaining({ node: httpName })]),
			);
		});

		it('round-trips 3-node chain with parameters', () => {
			const original: WorkflowJSON = {
				name: 'Three Node Chain',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com', method: 'POST' },
					},
					{
						id: '3',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 0],
						parameters: {
							values: { string: [{ name: 'key', value: 'val' }] },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			expect(parsed.nodes).toHaveLength(3);

			const normOriginal = normalizeForComparison(original);
			const normParsed = normalizeForComparison(parsed);

			// Parameters should survive the round-trip
			const origHttp = normOriginal.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!;
			const parsedHttp = normParsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!;
			expect(parsedHttp.parameters).toEqual(origHttp.parameters);
		});
	});

	describe('IF workflow', () => {
		it('round-trips Trigger → IF → two branches', () => {
			const original: WorkflowJSON = {
				name: 'IF Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [200, 0],
						parameters: {
							conditions: {
								options: {
									version: 2,
									caseSensitive: true,
									typeValidation: 'loose',
								},
								combinator: 'and',
								conditions: [
									{
										operator: {
											type: 'string',
											operation: 'equals',
										},
										leftValue: '={{ $json.status }}',
										rightValue: 'active',
									},
								],
							},
						},
					},
					{
						id: '3',
						name: 'True Branch',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, -100],
						parameters: {},
					},
					{
						id: '4',
						name: 'False Branch',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
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

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			// Should have 4 nodes: trigger, IF, true branch, false branch
			expect(parsed.nodes.length).toBeGreaterThanOrEqual(4);

			// Verify IF node exists with conditions
			const ifNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			expect(ifNode).toBeDefined();

			const conditions = (ifNode!.parameters as Record<string, unknown>)?.conditions as
				| Record<string, unknown>
				| undefined;
			expect(conditions).toBeDefined();

			// Verify IF has two output connections
			expect(parsed.connections[ifNode!.name!]).toBeDefined();
			const ifConns = parsed.connections[ifNode!.name!].main;
			expect(ifConns.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Switch workflow', () => {
		it('round-trips Trigger → Switch → three cases', () => {
			const original: WorkflowJSON = {
				name: 'Switch Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Switch',
						type: 'n8n-nodes-base.switch',
						typeVersion: 3,
						position: [200, 0],
						parameters: {
							rules: {
								values: [
									{
										conditions: {
											options: {
												version: 2,
												caseSensitive: true,
												typeValidation: 'loose',
											},
											combinator: 'and',
											conditions: [
												{
													operator: {
														type: 'string',
														operation: 'equals',
													},
													leftValue: '={{ $json.destination }}',
													rightValue: 'London',
												},
											],
										},
									},
									{
										conditions: {
											options: {
												version: 2,
												caseSensitive: true,
												typeValidation: 'loose',
											},
											combinator: 'and',
											conditions: [
												{
													operator: {
														type: 'string',
														operation: 'equals',
													},
													leftValue: '={{ $json.destination }}',
													rightValue: 'New York',
												},
											],
										},
									},
								],
							},
							options: { fallbackOutput: 'extra' },
						},
					},
					{
						id: '3',
						name: 'London Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, -100],
						parameters: {},
					},
					{
						id: '4',
						name: 'New York Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 0],
						parameters: {},
					},
					{
						id: '5',
						name: 'Default Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Switch', type: 'main', index: 0 }]],
					},
					Switch: {
						main: [
							[{ node: 'London Handler', type: 'main', index: 0 }],
							[
								{
									node: 'New York Handler',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Default Handler',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			// Should have switch node
			const switchNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(switchNode).toBeDefined();

			// Should have rules in parameters
			const rules = (switchNode!.parameters as Record<string, unknown>)?.rules as
				| Record<string, unknown>
				| undefined;
			expect(rules).toBeDefined();

			// Should have connections from switch to handlers
			const switchConns = parsed.connections[switchNode!.name!];
			expect(switchConns).toBeDefined();
			expect(switchConns.main.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('error handling', () => {
		it('round-trips Trigger → HTTP with onError → error handler', () => {
			const original: WorkflowJSON = {
				name: 'Error Handling',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
						onError: 'continueErrorOutput',
					},
					{
						id: '3',
						name: 'Error Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[], [{ node: 'Error Handler', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			// Verify error handling survives round-trip
			const httpNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			expect(httpNode!.onError).toBe('continueErrorOutput');
		});
	});

	describe('template fixtures', () => {
		it('round-trips easy_ai_starter.json (node types preserved)', () => {
			const original = loadTemplate('easy_ai_starter.json');
			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			// Verify workflow name
			expect(parsed.name).toBe(original.name);

			// Verify key node types are present (excluding sticky notes)
			const originalTypes = new Set(
				original.nodes.filter((n) => !n.type.includes('stickyNote')).map((n) => n.type),
			);
			const parsedTypes = new Set(parsed.nodes.map((n) => n.type));

			// Find missing types for debugging
			const missingTypes = [...originalTypes].filter((t) => !parsedTypes.has(t));
			expect(missingTypes).toEqual([]);
		});

		it('round-trips easy_ai_starter.json (AI connections preserved)', () => {
			const original = loadTemplate('easy_ai_starter.json');
			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);

			// Should have AI language model connections
			const aiConnections = Object.values(parsed.connections).some((nodeConns) => {
				const conns = nodeConns as Record<string, unknown>;
				return Object.keys(conns).some((k) => k.startsWith('ai_'));
			});
			expect(aiConnections).toBe(true);
		});
	});
});

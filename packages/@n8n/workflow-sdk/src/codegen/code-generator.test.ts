import { describe, it, expect } from '@jest/globals';
import { generateCode } from './code-generator';
import { buildSemanticGraph } from './semantic-graph';
import { annotateGraph } from './graph-annotator';
import { buildCompositeTree } from './composite-builder';
import type { WorkflowJSON } from '../types/base';

// Helper to generate code from workflow JSON
function generateFromWorkflow(json: WorkflowJSON): string {
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateCode(tree, json);
}

describe('code-generator', () => {
	describe('generateCode', () => {
		describe('output format', () => {
			it('starts with return keyword', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toMatch(/^return workflow\(/);
			});

			it('does not end with .toJSON()', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).not.toContain('.toJSON()');
			});
		});

		describe('simple workflows', () => {
			it('generates code for single trigger', () => {
				const json: WorkflowJSON = {
					name: 'Single Trigger',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("return workflow('");
				expect(code).toContain("'Single Trigger'");
				expect(code).toContain('trigger({');
				expect(code).toContain("type: 'n8n-nodes-base.manualTrigger'");
			});

			it('always includes config property even when empty', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger', // matches default name
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0], // at origin
							// no parameters, no credentials
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// config must always be present for the parser to work
				expect(code).toContain('config:');
			});

			it('generates code for linear chain', () => {
				const json: WorkflowJSON = {
					name: 'Linear Chain',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Final',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						Process: { main: [[{ node: 'Final', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('.then(');
				// Should have workflow-level chained structure: .add(trigger(...)).then(...)
				expect(code).toMatch(/\.add\(trigger\(/);
				expect(code).toMatch(/\.then\(node\(/);
			});
		});

		describe('IF branch', () => {
			it('generates ifBranch composite', () => {
				const json: WorkflowJSON = {
					name: 'IF Branch',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'FalseHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[{ node: 'FalseHandler', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('ifBranch([');
				// Should have true and false branches
				expect(code).toMatch(/ifBranch\(\[[\s\S]*node\([\s\S]*node\(/);
			});

			it('handles IF with null branch', () => {
				const json: WorkflowJSON = {
					name: 'IF Single Branch',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [[{ node: 'TrueHandler', type: 'main', index: 0 }], []],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('ifBranch([');
				expect(code).toContain('null');
			});
		});

		describe('Merge', () => {
			it('generates merge composite', () => {
				const json: WorkflowJSON = {
					name: 'Merge Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Branch1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, -50],
						},
						{
							id: '3',
							name: 'Branch2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 50],
						},
						{
							id: '4',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [200, 0],
							parameters: { numberInputs: 2 },
						},
					],
					connections: {
						Trigger: {
							main: [
								[
									{ node: 'Branch1', type: 'main', index: 0 },
									{ node: 'Branch2', type: 'main', index: 0 },
								],
							],
						},
						Branch1: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
						Branch2: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('merge([');
			});
		});

		describe('SplitInBatches', () => {
			it('generates splitInBatches composite', () => {
				const json: WorkflowJSON = {
					name: 'SplitInBatches Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'SplitInBatches',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'DoneHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'LoopBody',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
						SplitInBatches: {
							main: [
								[{ node: 'DoneHandler', type: 'main', index: 0 }],
								[{ node: 'LoopBody', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('splitInBatches(');
				expect(code).toContain('.done()');
				expect(code).toContain('.each()');
			});
		});

		describe('variables', () => {
			it('generates variable declarations for cycle targets', () => {
				const json: WorkflowJSON = {
					name: 'Cycle Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'SplitInBatches',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
						SplitInBatches: {
							main: [[], [{ node: 'Process', type: 'main', index: 0 }]],
						},
						Process: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// Should have a variable declaration for the cycle target
				expect(code).toMatch(/const \w+ = /);
			});

			it('generates variable references', () => {
				const json: WorkflowJSON = {
					name: 'Convergence Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'FalseHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '5',
							name: 'Common',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[{ node: 'FalseHandler', type: 'main', index: 0 }],
							],
						},
						TrueHandler: { main: [[{ node: 'Common', type: 'main', index: 0 }]] },
						FalseHandler: { main: [[{ node: 'Common', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// Should have variable declaration for convergence point
				expect(code).toMatch(/const \w+ = /);
			});
		});

		describe('empty workflow', () => {
			it('handles empty workflow', () => {
				const json: WorkflowJSON = {
					name: 'Empty',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("return workflow('");
				expect(code).toContain("'Empty'");
			});
		});

		describe('workflow settings', () => {
			it('includes settings in workflow call when present', () => {
				const json: WorkflowJSON = {
					id: 'settings-test',
					name: 'Settings Test',
					nodes: [],
					connections: {},
					settings: {
						timezone: 'America/New_York',
						executionOrder: 'v1',
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("return workflow('settings-test', 'Settings Test',");
				expect(code).toContain("timezone: 'America/New_York'");
				expect(code).toContain("executionOrder: 'v1'");
			});

			it('omits settings when empty', () => {
				const json: WorkflowJSON = {
					id: 'no-settings',
					name: 'No Settings',
					nodes: [],
					connections: {},
					settings: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("return workflow('no-settings', 'No Settings')");
				expect(code).not.toContain('timezone');
			});

			it('omits settings when undefined', () => {
				const json: WorkflowJSON = {
					id: 'undefined-settings',
					name: 'Undefined Settings',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toMatch(/return workflow\('undefined-settings', 'Undefined Settings'\)$/m);
			});
		});

		describe('string escaping', () => {
			it('escapes single quotes in workflow name', () => {
				const json: WorkflowJSON = {
					id: 'escape-test',
					name: "It's a test",
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("'It\\'s a test'");
			});

			it('escapes backslashes in workflow name', () => {
				const json: WorkflowJSON = {
					id: 'escape-test',
					name: 'Path\\to\\file',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("'Path\\\\to\\\\file'");
			});

			it('escapes newlines in node name', () => {
				const json: WorkflowJSON = {
					id: 'escape-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Line1\nLine2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("name: 'Line1\\nLine2'");
			});

			it('escapes single quotes in parameter values', () => {
				const json: WorkflowJSON = {
					id: 'escape-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Node',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								message: "Hello, it's me",
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("message: 'Hello, it\\'s me'");
			});

			it('handles undefined workflow name', () => {
				const json = {
					id: 'test-id',
					// name is undefined
					nodes: [],
					connections: {},
				} as unknown as WorkflowJSON;

				const code = generateFromWorkflow(json);

				// Should use a default name instead of crashing
				expect(code).toContain("workflow('test-id', 'Untitled Workflow')");
			});

			it('escapes Unicode smart quotes in node names', () => {
				const json: WorkflowJSON = {
					id: 'smart-quotes',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'When clicking \u2018Execute workflow\u2019', // Unicode smart quotes
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [100, 100],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Smart quotes must be escaped for valid JS syntax
				expect(code).toContain("name: 'When clicking");
				expect(code).not.toContain('\u2018'); // No unescaped left smart quote
				expect(code).not.toContain('\u2019'); // No unescaped right smart quote
			});

			it('quotes object keys with spaces', () => {
				const json: WorkflowJSON = {
					id: 'space-keys',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Update',
							type: 'n8n-nodes-base.googleSheets',
							typeVersion: 4.5,
							position: [100, 100],
							parameters: {
								columns: {
									value: {
										'VIDEO URL': '={{ $json.url }}',
									},
								},
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Keys with spaces must be quoted for valid JS syntax
				expect(code).toContain("'VIDEO URL':");
				expect(code).not.toMatch(/[^'"]VIDEO URL[^'"]/); // Not unquoted
			});
		});

		describe('default node names', () => {
			it('omits name config when node name matches default', () => {
				const json: WorkflowJSON = {
					id: 'default-name-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Should NOT have name in config since it matches the default
				expect(code).not.toContain("name: 'HTTP Request'");
			});

			it('includes name config when node name differs from default', () => {
				const json: WorkflowJSON = {
					id: 'custom-name-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Custom Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("name: 'My Custom Request'");
			});

			it('generates correct default name from camelCase type', () => {
				const json: WorkflowJSON = {
					id: 'camel-case-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Should NOT have name since "Manual Trigger" matches default for "manualTrigger"
				expect(code).not.toContain("name: 'Manual Trigger'");
			});
		});

		describe('position tracking', () => {
			it('includes position when non-zero', () => {
				const json: WorkflowJSON = {
					id: 'position-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [200, 100],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('position: [200, 100]');
			});

			it('omits position when at origin [0, 0]', () => {
				const json: WorkflowJSON = {
					id: 'position-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).not.toContain('position:');
			});
		});

		describe('sticky notes', () => {
			it('generates sticky() call for sticky note nodes', () => {
				const json: WorkflowJSON = {
					id: 'sticky-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [100, 200],
							parameters: {
								content: '## Documentation\n\nThis is a note.',
								color: 4,
								width: 300,
								height: 200,
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('sticky(');
				expect(code).toContain('## Documentation\\n\\nThis is a note.');
				expect(code).toContain('color: 4');
				expect(code).toContain('width: 300');
				expect(code).toContain('height: 200');
			});

			it('generates sticky with custom name', () => {
				const json: WorkflowJSON = {
					id: 'sticky-name-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Custom Note',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'Note content',
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("name: 'My Custom Note'");
			});
		});

		describe('reserved keywords', () => {
			it('appends _node suffix for reserved keyword variable names', () => {
				const json: WorkflowJSON = {
					id: 'reserved-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'If',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'True',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'False',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '5',
							name: 'Merge',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'If', type: 'main', index: 0 }]] },
						If: {
							main: [
								[{ node: 'True', type: 'main', index: 0 }],
								[{ node: 'False', type: 'main', index: 0 }],
							],
						},
						True: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
						False: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// "Merge" is a reserved SDK function, so variable should be merge_node
				expect(code).toContain('const merge_node =');
			});
		});
	});
});

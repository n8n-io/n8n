import { describe, it, expect } from '@jest/globals';
import { generateCode } from './code-generator';
import { buildSemanticGraph } from './semantic-graph';
import { annotateGraph } from './graph-annotator';
import { buildCompositeTree } from './composite-builder';
import { parseWorkflowCode } from '../parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

// Helper to generate code from workflow JSON
function generateFromWorkflow(json: WorkflowJSON): string {
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateCode(tree, json, graph);
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

			it('uses variable reference for error handler nodes referenced multiple times', () => {
				// Pattern: Multiple nodes have error outputs pointing to the same error handler
				// The error handler should be declared as a variable and referenced, not inlined
				const json: WorkflowJSON = {
					id: 'error-handler-var-test',
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
							name: 'Node A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [100, 0],
							parameters: { options: {} },
							onError: 'continueErrorOutput',
						},
						{
							id: '3',
							name: 'Node B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [200, 0],
							parameters: { options: {} },
							onError: 'continueErrorOutput',
						},
						{
							id: '4',
							name: 'Error Handler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [150, 200],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Node A', type: 'main', index: 0 }]] },
						'Node A': {
							main: [
								[{ node: 'Node B', type: 'main', index: 0 }], // output 0: success
								[{ node: 'Error Handler', type: 'main', index: 0 }], // output 1: error
							],
						},
						'Node B': {
							main: [
								[], // output 0: success (no connection)
								[{ node: 'Error Handler', type: 'main', index: 0 }], // output 1: error
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should have variable declaration for error handler (referenced by multiple nodes)
				expect(code).toContain('const error_Handler =');

				// Should use variable reference in .onError() calls, not inline node
				// Count how many times the variable name appears vs how many times the full node() call appears
				const varRefCount = (code.match(/\.onError\(error_Handler\)/g) || []).length;
				const inlineCount = (code.match(/\.onError\(node\(\{/g) || []).length;

				// All .onError() calls should use the variable reference
				expect(varRefCount).toBe(2); // Both Node A and Node B
				expect(inlineCount).toBe(0); // No inline node() calls
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

				// Should generate valid code without crashing, preserving empty name
				expect(code).toContain("workflow('test-id', '')");
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

			it('preserves Unicode smart quotes through roundtrip', () => {
				const originalName = 'What\u2019s the weather in Paris?'; // RIGHT SINGLE QUOTATION MARK
				const json: WorkflowJSON = {
					id: 'roundtrip-unicode',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [100, 100],
						},
						{
							id: '2',
							name: 'Note',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [200, 100],
							parameters: {
								content: originalName,
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// The unicode character should be preserved as escape sequence
				expect(code).toContain('\\u2019'); // Unicode escape sequence in generated code

				// When eval'd, should produce the original character
				const evalResult = eval(`'What\\u2019s the weather in Paris?'`);
				expect(evalResult).toBe(originalName);
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

			it('always includes name for composite nodes like IF (even if matching default)', () => {
				// The parser's ifBranch defaults to "IF", but the codegen default is "If"
				// We must always include the name for composite nodes to ensure roundtrip works
				const json: WorkflowJSON = {
					id: 'if-name-test',
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
							name: 'If', // Matches codegen default but not parser default
							type: 'n8n-nodes-base.if',
							typeVersion: 2.2,
							position: [100, 0],
							parameters: { conditions: {} },
						},
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'If', type: 'main', index: 0 }]] },
						If: { main: [[{ node: 'TrueHandler', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// IF node must always include its name in the config for roundtrip
				expect(code).toContain("name: 'If'");
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

		describe('AI subnodes', () => {
			it('generates subnodes config with languageModel() calls', () => {
				const json: WorkflowJSON = {
					id: 'ai-subnodes-test',
					name: 'AI Subnodes Test',
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
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1.7,
							position: [200, 0],
							parameters: {
								promptType: 'auto',
								text: 'Hello',
							},
						},
						{
							id: '3',
							name: 'OpenAI Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1.2,
							position: [200, 200],
							parameters: {
								model: 'gpt-4',
							},
							credentials: {
								openAiApi: { name: 'OpenAI', id: 'cred-123' },
							},
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
						'OpenAI Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should generate subnodes config with languageModel() call
				expect(code).toContain('subnodes:');
				expect(code).toContain('model: languageModel(');
				expect(code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
			});

			it('generates subnodes config with tool() calls for multiple tools', () => {
				const json: WorkflowJSON = {
					id: 'ai-tools-test',
					name: 'AI Tools Test',
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
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1.7,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'OpenAI Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 200],
							parameters: {},
						},
						{
							id: '4',
							name: 'Code Tool',
							type: '@n8n/n8n-nodes-langchain.toolCode',
							typeVersion: 1.1,
							position: [200, 300],
							parameters: { code: 'return 1' },
						},
						{
							id: '5',
							name: 'Calculator',
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							typeVersion: 1,
							position: [200, 400],
							parameters: {},
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
						'OpenAI Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
						'Code Tool': {
							ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
						},
						Calculator: {
							ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should generate subnodes config with tools array
				expect(code).toContain('subnodes:');
				expect(code).toContain('model: languageModel(');
				expect(code).toContain('tools: [');
				expect(code).toContain('tool(');
				// Should have multiple tool() calls
				expect(code.match(/tool\(/g)?.length).toBeGreaterThanOrEqual(2);
			});

			it('generates memory() call for memory subnodes', () => {
				const json: WorkflowJSON = {
					id: 'ai-memory-test',
					name: 'AI Memory Test',
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
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1.7,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'Buffer Memory',
							type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
							typeVersion: 1.2,
							position: [200, 200],
							parameters: { contextWindowLength: 5 },
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
						'Buffer Memory': {
							ai_memory: [[{ node: 'AI Agent', type: 'ai_memory', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('subnodes:');
				expect(code).toContain('memory: memory(');
			});
		});

		describe('fan-out patterns', () => {
			it('generates .then([...]) for fan-out without merge', () => {
				const json: WorkflowJSON = {
					id: 'fanout-test',
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
							name: 'Source',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Target1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'Target2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Source', type: 'main', index: 0 }]] },
						Source: {
							main: [
								[
									{ node: 'Target1', type: 'main', index: 0 },
									{ node: 'Target2', type: 'main', index: 0 },
								],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should use array syntax for parallel targets
				expect(code).toContain('.then([');
				expect(code).toContain('Target1');
				expect(code).toContain('Target2');
				// Should NOT have sequential chaining between targets
				expect(code).not.toMatch(/Target1.*\.then.*Target2/s);
			});

			it('generates .then([...]) for fan-out with downstream chains', () => {
				const json: WorkflowJSON = {
					id: 'fanout-chains',
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
							name: 'Upload',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Instagram',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -100],
						},
						{
							id: '4',
							name: 'YouTube',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
						{
							id: '5',
							name: 'TikTok',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 100],
						},
						{
							id: '6',
							name: 'IG Analytics',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, -100],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Upload', type: 'main', index: 0 }]] },
						Upload: {
							main: [
								[
									{ node: 'Instagram', type: 'main', index: 0 },
									{ node: 'YouTube', type: 'main', index: 0 },
									{ node: 'TikTok', type: 'main', index: 0 },
								],
							],
						},
						Instagram: { main: [[{ node: 'IG Analytics', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// Should use array syntax for parallel targets
				expect(code).toContain('.then([');
				// All three branches should be present
				expect(code).toContain('Instagram');
				expect(code).toContain('YouTube');
				expect(code).toContain('TikTok');
				// Instagram branch should have downstream chain to IG Analytics
				expect(code).toContain('IG Analytics');
			});
		});

		describe('composite node parameters roundtrip', () => {
			it('preserves switchCase parameters through roundtrip', () => {
				const json: WorkflowJSON = {
					id: 'switch-params-test',
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
							name: 'Switch',
							type: 'n8n-nodes-base.switch',
							typeVersion: 3.2,
							position: [100, 0],
							parameters: {
								rules: {
									values: [
										{
											outputKey: 'Case1',
											conditions: {
												options: { version: 2, leftValue: '', caseSensitive: true },
												combinator: 'and',
												conditions: [
													{
														id: 'test-id',
														operator: { type: 'string', operation: 'exists' },
														leftValue: '={{ $json.test }}',
													},
												],
											},
										},
									],
								},
								options: {},
							},
						},
						{
							id: '3',
							name: 'Case1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
						{
							id: '4',
							name: 'Fallback',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 100],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Switch', type: 'main', index: 0 }]] },
						Switch: {
							main: [
								[{ node: 'Case1', type: 'main', index: 0 }],
								[{ node: 'Fallback', type: 'main', index: 0 }],
							],
						},
					},
				};

				// Generate code
				const code = generateFromWorkflow(json);

				// Verify parameters are in generated code
				expect(code).toContain('parameters:');
				expect(code).toContain('rules');
				expect(code).toContain('Case1');

				// Parse back to JSON
				const parsedJson = parseWorkflowCode(code);

				// Find the Switch node
				const switchNode = parsedJson.nodes.find((n) => n.name === 'Switch');
				expect(switchNode).toBeDefined();
				expect(switchNode?.type).toBe('n8n-nodes-base.switch');

				// Verify parameters are preserved
				expect(switchNode?.parameters).toBeDefined();
				expect(switchNode?.parameters?.rules).toBeDefined();
				expect(switchNode?.parameters?.options).toBeDefined();
			});

			it('preserves ifBranch parameters through roundtrip', () => {
				const json: WorkflowJSON = {
					id: 'if-params-test',
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
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [100, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true },
									combinator: 'and',
									conditions: [
										{
											id: 'test-if-id',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
									],
								},
								options: {},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'False Branch',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'True Branch', type: 'main', index: 0 }],
								[{ node: 'False Branch', type: 'main', index: 0 }],
							],
						},
					},
				};

				// Generate code
				const code = generateFromWorkflow(json);

				// Verify parameters are in generated code
				expect(code).toContain('parameters:');
				expect(code).toContain('conditions');

				// Parse back to JSON
				const parsedJson = parseWorkflowCode(code);

				// Find the IF node
				const ifNode = parsedJson.nodes.find((n) => n.name === 'IF');
				expect(ifNode).toBeDefined();
				expect(ifNode?.type).toBe('n8n-nodes-base.if');

				// Verify parameters are preserved
				expect(ifNode?.parameters).toBeDefined();
				expect(ifNode?.parameters?.conditions).toBeDefined();
			});

			it('preserves IF node parameters when IF is a cycle target', () => {
				// Read the actual workflow 5755 JSON which has IF nodes as cycle targets
				const fs = require('fs');
				const path = require('path');
				const jsonPath = path.join(__dirname, '../../test-fixtures/real-workflows/5755.json');
				const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

				// Find the Animation Completed? node in original
				const originalNode = json.nodes.find(
					(n: { name: string }) => n.name === 'Animation Completed?',
				);
				expect(originalNode?.type).toBe('n8n-nodes-base.if');
				expect(originalNode?.parameters).toBeDefined();

				// Generate and parse back to JSON
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// Find the Animation Completed? node in parsed output
				const parsedNode = parsedJson.nodes.find(
					(n: { name: string }) => n.name === 'Animation Completed?',
				);

				// Verify parameters are preserved
				expect(parsedNode).toBeDefined();
				expect(parsedNode?.parameters).toBeDefined();
				expect(parsedNode?.parameters?.conditions).toBeDefined();
			});

			it('preserves ifBranch parameters with cycle pattern (like workflow 5755)', () => {
				// This replicates the pattern from workflow 5755 where:
				// 1. A variable is declared for a cycle target node
				// 2. The IF node has a chain on true branch and the variable on false branch
				// 3. There's a cycle back from the chain to the variable node
				const json: WorkflowJSON = {
					id: 'if-cycle-params-test',
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
							name: 'Wait Node',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [100, 0],
							parameters: { amount: 60 },
						},
						{
							id: '3',
							name: 'Check Status',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [200, 0],
							parameters: { url: 'https://api.example.com/status' },
						},
						{
							id: '4',
							name: 'Status Check',
							type: 'n8n-nodes-base.if',
							typeVersion: 2.2,
							position: [300, 0],
							parameters: {
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'status-completed',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								options: {},
							},
						},
						{
							id: '5',
							name: 'Process Result',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [400, -50],
							parameters: { options: {} },
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Wait Node', type: 'main', index: 0 }]] },
						'Wait Node': { main: [[{ node: 'Check Status', type: 'main', index: 0 }]] },
						'Check Status': { main: [[{ node: 'Status Check', type: 'main', index: 0 }]] },
						'Status Check': {
							main: [
								[{ node: 'Process Result', type: 'main', index: 0 }], // True branch
								[{ node: 'Wait Node', type: 'main', index: 0 }], // False branch (cycle back)
							],
						},
					},
				};

				// Generate code
				const code = generateFromWorkflow(json);

				// Should have a variable declaration for the cycle target
				expect(code).toContain('const');
				expect(code).toContain('Wait Node');

				// Verify IF parameters are in generated code
				expect(code).toContain('parameters:');
				expect(code).toContain('conditions');
				expect(code).toContain('COMPLETED');

				// Parse back to JSON
				const parsedJson = parseWorkflowCode(code);

				// Find the IF node (Status Check)
				const ifNode = parsedJson.nodes.find((n) => n.name === 'Status Check');
				expect(ifNode).toBeDefined();
				expect(ifNode?.type).toBe('n8n-nodes-base.if');

				// Verify parameters are preserved - THIS IS THE KEY TEST
				expect(ifNode?.parameters).toBeDefined();
				expect(ifNode?.parameters?.conditions).toBeDefined();
				expect(ifNode?.parameters?.options).toBeDefined();
			});
		});

		describe('merge node outgoing connections', () => {
			it('preserves merge node outgoing connections when merge has .then()', () => {
				// Pattern: trigger → [branch1, branch2] → merge → loopOverItems
				// The merge node's connection to loopOverItems should be preserved
				const json: WorkflowJSON = {
					id: 'merge-outgoing-test',
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
							name: 'Merge: All Sources',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [200, 0],
							parameters: { numberInputs: 2 },
						},
						{
							id: '5',
							name: 'Loop Over Items',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [300, 0],
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
						Branch1: { main: [[{ node: 'Merge: All Sources', type: 'main', index: 0 }]] },
						Branch2: { main: [[{ node: 'Merge: All Sources', type: 'main', index: 1 }]] },
						'Merge: All Sources': { main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]] },
					},
				};

				// Generate code and parse back
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// The key test: Merge: All Sources should have an outgoing connection
				expect(Object.keys(parsedJson.connections)).toContain('Merge: All Sources');
				expect(parsedJson.connections['Merge: All Sources']).toBeDefined();
				expect(parsedJson.connections['Merge: All Sources'].main[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'Loop Over Items' })]),
				);
			});
		});

		describe('chain intermediate node connections', () => {
			it('preserves intermediate node connections in linear chain', () => {
				// Pattern: trigger → Wait 1 → Wait 2 → Loop
				// Wait 2's connection to Loop should be preserved
				const json: WorkflowJSON = {
					id: 'chain-intermediate-test',
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
							name: 'Wait 1',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [100, 0],
							parameters: { amount: 1 },
						},
						{
							id: '3',
							name: 'Wait 2',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [200, 0],
							parameters: { amount: 2 },
						},
						{
							id: '4',
							name: 'Loop',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Wait 1', type: 'main', index: 0 }]] },
						'Wait 1': { main: [[{ node: 'Wait 2', type: 'main', index: 0 }]] },
						'Wait 2': { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
					},
				};

				// Generate code and parse back
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// The key test: Wait 2 should have an outgoing connection to Loop
				expect(Object.keys(parsedJson.connections)).toContain('Wait 2');
				expect(parsedJson.connections['Wait 2']).toBeDefined();
				expect(parsedJson.connections['Wait 2'].main[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'Loop' })]),
				);
			});

			it('preserves connection from node chain to splitInBatches composite', () => {
				// Pattern: trigger → Wait 1 → Wait 2 → splitInBatches with .each().then() chain
				// This replicates the pattern from workflow 5682 where the connection
				// from Wait 2 to Debate Loop (splitInBatches) is lost
				const json: WorkflowJSON = {
					id: 'chain-to-composite-test',
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
							name: 'Wait 1',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [100, 0],
							parameters: { amount: 1 },
						},
						{
							id: '3',
							name: 'Wait 2',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [200, 0],
							parameters: { amount: 2 },
						},
						{
							id: '4',
							name: 'Debate Loop',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [300, 0],
						},
						{
							id: '5',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [400, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Wait 1', type: 'main', index: 0 }]] },
						'Wait 1': { main: [[{ node: 'Wait 2', type: 'main', index: 0 }]] },
						'Wait 2': { main: [[{ node: 'Debate Loop', type: 'main', index: 0 }]] },
						'Debate Loop': {
							main: [
								[], // done output
								[{ node: 'Process', type: 'main', index: 0 }], // each output
							],
						},
					},
				};

				// Generate code and parse back
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// The key test: Wait 2 should have an outgoing connection to Debate Loop
				expect(Object.keys(parsedJson.connections)).toContain('Wait 2');
				expect(parsedJson.connections['Wait 2']).toBeDefined();
				expect(parsedJson.connections['Wait 2'].main[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'Debate Loop' })]),
				);
			});

			it('preserves connection when chain inside splitInBatches.each() ends with another splitInBatches', () => {
				// Pattern from workflow 5682:
				// outer_sib.each().then(A.then(B.then(Wait1.then(Wait2.then(inner_sib.each()...)))))
				// The connection from Wait2 to inner_sib is lost
				const json: WorkflowJSON = {
					id: 'nested-sib-test',
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
							name: 'Outer Loop',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Process A',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '4',
							name: 'Wait 1',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [300, 50],
							parameters: { amount: 1 },
						},
						{
							id: '5',
							name: 'Wait 2',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [400, 50],
							parameters: { amount: 2 },
						},
						{
							id: '6',
							name: 'Inner Loop',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [500, 50],
						},
						{
							id: '7',
							name: 'Inner Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [600, 100],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Outer Loop', type: 'main', index: 0 }]] },
						'Outer Loop': {
							main: [
								[], // done output
								[{ node: 'Process A', type: 'main', index: 0 }], // each output
							],
						},
						'Process A': { main: [[{ node: 'Wait 1', type: 'main', index: 0 }]] },
						'Wait 1': { main: [[{ node: 'Wait 2', type: 'main', index: 0 }]] },
						'Wait 2': { main: [[{ node: 'Inner Loop', type: 'main', index: 0 }]] },
						'Inner Loop': {
							main: [
								[], // done output
								[{ node: 'Inner Process', type: 'main', index: 0 }], // each output
							],
						},
					},
				};

				// Generate code and parse back
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// The key test: Wait 2 should have an outgoing connection to Inner Loop
				expect(Object.keys(parsedJson.connections)).toContain('Wait 2');
				expect(parsedJson.connections['Wait 2']).toBeDefined();
				expect(parsedJson.connections['Wait 2'].main[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'Inner Loop' })]),
				);
			});

			it('preserves connections for inline node connecting to predeclared variable', () => {
				// Pattern: IF → true: Filter → predeclared_var (cycle target)
				// Filter's connection to the predeclared variable should be preserved
				const json: WorkflowJSON = {
					id: 'inline-to-predeclared-test',
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
						{
							id: '4',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							typeVersion: 2,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
						SplitInBatches: {
							main: [
								[], // done output
								[{ node: 'Process', type: 'main', index: 0 }], // each output
							],
						},
						Process: { main: [[{ node: 'Filter', type: 'main', index: 0 }]] },
						Filter: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] }, // cycle back
					},
				};

				// Generate code and parse back
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// The key test: Filter should have an outgoing connection to SplitInBatches
				expect(Object.keys(parsedJson.connections)).toContain('Filter');
				expect(parsedJson.connections['Filter']).toBeDefined();
				expect(parsedJson.connections['Filter'].main[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'SplitInBatches' })]),
				);
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

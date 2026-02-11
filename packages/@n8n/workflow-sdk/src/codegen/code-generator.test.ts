import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { generateCode } from './code-generator';
import { buildCompositeTree } from './composite-builder';
import { annotateGraph } from './graph-annotator';
import { parseWorkflowCode } from './parse-workflow-code';
import { buildSemanticGraph } from './semantic-graph';
import { ensureFixtures } from '../__tests__/fixtures-download';
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
			it('uses variables-first format with const wf = workflow(...)', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Should start with const wf = workflow(...)
				expect(code).toMatch(/^const wf = workflow\(/);
				// Should end with export default wf
				expect(code.trim()).toMatch(/export default wf$/);
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

				expect(code).toContain("const wf = workflow('");
				expect(code).toContain("'Single Trigger'");
				expect(code).toContain('trigger({');
				expect(code).toContain("type: 'n8n-nodes-base.manualTrigger'");
				expect(code).toContain('export default wf');
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

				expect(code).toContain('.to(');
				// All nodes should be variables
				// Note: 'process' is a reserved word, so it becomes 'process_node'
				expect(code).toContain('const trigger_node = trigger({');
				expect(code).toContain('const process_node = node({');
				expect(code).toContain('const final = node({');
				// Workflow should chain variable references
				expect(code).toMatch(/\.add\(trigger_node\)/);
				expect(code).toMatch(/\.to\(process_node\)/);
				expect(code).toMatch(/\.to\(final\)/);
			});
		});

		describe('IF branch', () => {
			it('generates ifElse composite', () => {
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

				// Should have IF node and branch variable references
				expect(code).toContain('const iF = node({');
				expect(code).toContain('const trueHandler = node({');
				expect(code).toContain('const falseHandler = node({');
				// The ifElse should use fluent API syntax
				expect(code).toContain('iF.onTrue(trueHandler).onFalse(falseHandler)');
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

				// Should use fluent API syntax with only onTrue (no onFalse since false branch is null)
				expect(code).toContain('iF.onTrue(trueHandler)');
				// Should not have onFalse since false branch is null
				expect(code).not.toContain('onFalse');
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

				// Should use .input(n) syntax for connecting branches to merge
				// Each branch should have .to(merge_node.input(n))
				expect(code).toContain('.input(0)');
				expect(code).toContain('.input(1)');
				expect(code).toContain('merge_node'); // The merge node variable
			});
		});

		describe('SplitInBatches', () => {
			it('generates splitInBatches with fluent API syntax (.onEachBatch/.onDone)', () => {
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

				// Should use fluent API syntax: splitInBatches(sibVar).onEachBatch(...).onDone(...)
				expect(code).toContain('splitInBatches(');
				expect(code).toContain('.onEachBatch(');
				expect(code).toContain('.onDone(');
				// Should NOT use old object syntax
				expect(code).not.toMatch(/splitInBatches\(\w+,\s*\{/);
				expect(code).not.toContain('done:');
				expect(code).not.toContain('each:');
				// Should NOT use old chain API
				expect(code).not.toContain('.done()');
				expect(code).not.toContain('.each()');
			});

			it('generates nextBatch() for loop back connections', () => {
				const json: WorkflowJSON = {
					name: 'SplitInBatches Loop Test',
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

				// Should use nextBatch() for loop back
				expect(code).toContain('nextBatch(');
				// Should NOT use .loop()
				expect(code).not.toContain('.loop()');
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
				const varRefCount = (code.match(/\.onError\(error_Handler\)/g) ?? []).length;
				const inlineCount = (code.match(/\.onError\(node\(\{/g) ?? []).length;

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

				expect(code).toContain("const wf = workflow('");
				expect(code).toContain("'Empty'");
				expect(code).toContain('export default wf');
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

				expect(code).toContain("const wf = workflow('settings-test', 'Settings Test',");
				expect(code).toContain("timezone: 'America/New_York'");
				expect(code).toContain("executionOrder: 'v1'");
				expect(code).toContain('export default wf');
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

				expect(code).toContain("const wf = workflow('no-settings', 'No Settings')");
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

				expect(code).toContain("const wf = workflow('undefined-settings', 'Undefined Settings')");
				expect(code).toContain('export default wf');
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
				// eslint-disable-next-line no-eval -- Testing eval behavior for unicode escaping
				const evalResult = eval("'What\\u2019s the weather in Paris?'") as string;
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
			it('always includes name for reliable roundtrip', () => {
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

				// Name is always included for reliable roundtrip (parser defaults may differ from codegen)
				expect(code).toContain("name: 'HTTP Request'");
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

			it('always includes node name for reliable roundtrip', () => {
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

				// Name is always included for reliable roundtrip (parser defaults may differ from codegen)
				expect(code).toContain("name: 'Manual Trigger'");
			});

			it('always includes name for composite nodes like IF (even if matching default)', () => {
				// The parser's ifElse defaults to "IF", but the codegen default is "If"
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

			it('generates sticky with empty nodes array when sticky has no dimensions', () => {
				const json: WorkflowJSON = {
					id: 'sticky-no-dimensions-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'Note content',
								// No width or height
							},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [50, 50],
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Sticky should have empty nodes array since it has no dimensions
				expect(code).toContain("sticky('Note content', []");
			});

			it('generates sticky with empty nodes array when no nodes inside bounds', () => {
				const json: WorkflowJSON = {
					id: 'sticky-no-nodes-inside-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'Note content',
								width: 200,
								height: 100,
							},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [500, 500], // Outside sticky bounds
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Sticky should have empty nodes array since HTTP is outside bounds
				expect(code).toContain("sticky('Note content', []");
			});

			it('generates sticky with node varname when node top-left is inside bounds', () => {
				const json: WorkflowJSON = {
					id: 'sticky-node-inside-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'API Section',
								width: 300,
								height: 200,
							},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [50, 50], // Inside sticky bounds
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Sticky should include the HTTP node's variable name (hTTP_Request is generated variable name)
				expect(code).toContain("sticky('API Section', [hTTP_Request]");
			});

			it('generates sticky with multiple node varnames when multiple nodes inside bounds', () => {
				const json: WorkflowJSON = {
					id: 'sticky-multiple-nodes-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'My Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'Data Processing',
								width: 500,
								height: 400,
							},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [50, 50], // Inside sticky
						},
						{
							id: '3',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [100, 100], // Inside sticky
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Sticky should include both nodes' variable names
				expect(code).toContain("sticky('Data Processing', [hTTP_Request, set]");
			});

			it('excludes other sticky notes from nodes array', () => {
				const json: WorkflowJSON = {
					id: 'sticky-excludes-stickies-test',
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Outer Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								content: 'Outer',
								width: 500,
								height: 400,
							},
						},
						{
							id: '2',
							name: 'Inner Sticky',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [50, 50], // Inside outer sticky bounds
							parameters: {
								content: 'Inner',
								width: 100,
								height: 50,
							},
						},
					],
					connections: {},
				};

				const code = generateFromWorkflow(json);

				// Outer sticky should NOT include inner sticky in nodes array
				// It should have empty nodes array
				expect(code).toContain("sticky('Outer', []");
			});
		});

		describe('AI subnodes', () => {
			it('declares subnodes as variables at top of file', () => {
				const json: WorkflowJSON = {
					id: 'ai-subnodes-var-test',
					name: 'AI Subnodes Variable Test',
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

				// Subnode should be declared as a variable
				expect(code).toMatch(/const openAI_Model = languageModel\(/);

				// Parent node should reference subnode by variable name, not inline
				expect(code).toContain('subnodes: { model: openAI_Model }');

				// The languageModel call should NOT appear inline in the node config
				// (only as a variable declaration)
				const inlineModelCount = (code.match(/model: languageModel\(/g) ?? []).length;
				expect(inlineModelCount).toBe(0);
			});

			it('declares multiple tool subnodes as variables', () => {
				const json: WorkflowJSON = {
					id: 'ai-tools-var-test',
					name: 'AI Tools Variable Test',
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

				// All subnodes should be declared as variables
				expect(code).toMatch(/const openAI_Model = languageModel\(/);
				expect(code).toMatch(/const code_Tool = tool\(/);
				expect(code).toMatch(/const calculator = tool\(/);

				// Parent node should reference subnodes by variable names
				expect(code).toContain('model: openAI_Model');
				expect(code).toMatch(/tools: \[code_Tool, calculator\]|tools: \[calculator, code_Tool\]/);

				// No inline tool() calls in subnodes config
				const inlineToolCount = (code.match(/tools: \[tool\(/g) ?? []).length;
				expect(inlineToolCount).toBe(0);
			});

			it('declares memory subnode as variable', () => {
				const json: WorkflowJSON = {
					id: 'ai-memory-var-test',
					name: 'AI Memory Variable Test',
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

				// Memory subnode should be declared as a variable
				expect(code).toMatch(/const buffer_Memory = memory\(/);

				// Parent node should reference by variable name
				expect(code).toContain('memory: buffer_Memory');

				// No inline memory() call
				const inlineMemoryCount = (code.match(/memory: memory\(/g) ?? []).length;
				expect(inlineMemoryCount).toBe(0);
			});

			it('declares subnode variables before regular node variables', () => {
				const json: WorkflowJSON = {
					id: 'ai-order-test',
					name: 'AI Order Test',
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
							name: 'Shared Node',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
						'AI Agent': { main: [[{ node: 'Shared Node', type: 'main', index: 0 }]] },
						'OpenAI Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Subnode variable declaration should come before workflow variable
				const subnodeVarIndex = code.indexOf('const openAI_Model = languageModel(');
				const workflowVarIndex = code.indexOf('const wf = workflow(');

				expect(subnodeVarIndex).toBeGreaterThan(-1);
				expect(workflowVarIndex).toBeGreaterThan(-1);
				expect(subnodeVarIndex).toBeLessThan(workflowVarIndex);
			});

			it('handles nested subnodes (subnode with its own subnodes)', () => {
				// Test case: AI Agent with a tool that has its own language model
				const json: WorkflowJSON = {
					id: 'nested-subnodes-test',
					name: 'Nested Subnodes Test',
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
							name: 'Main Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 200],
							parameters: {},
						},
						{
							id: '4',
							name: 'Summarization Chain',
							type: '@n8n/n8n-nodes-langchain.chainSummarization',
							typeVersion: 2,
							position: [200, 300],
							parameters: {},
						},
						{
							id: '5',
							name: 'Chain Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 400],
							parameters: { model: 'gpt-3.5-turbo' },
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
						'Main Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
						'Summarization Chain': {
							ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
						},
						'Chain Model': {
							ai_languageModel: [
								[{ node: 'Summarization Chain', type: 'ai_languageModel', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// All subnodes should be declared as variables (including nested ones)
				expect(code).toMatch(/const main_Model = languageModel\(/);
				expect(code).toMatch(/const chain_Model = languageModel\(/);
				expect(code).toMatch(/const summarization_Chain = tool\(/);

				// Chain Model should be declared before Summarization Chain (since it's used by it)
				const chainModelIndex = code.indexOf('const chain_Model = languageModel(');
				const summarizationIndex = code.indexOf('const summarization_Chain = tool(');
				expect(chainModelIndex).toBeLessThan(summarizationIndex);

				// Summarization Chain should reference Chain Model by variable
				// The tool() call for summarization chain should use the variable reference
				expect(code).toMatch(/subnodes: \{ model: chain_Model \}/);
			});

			// Keep the old tests but update expectations
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

				// Should generate subnodes config with variable reference
				expect(code).toContain('subnodes:');
				// languageModel() should be a variable declaration, not inline
				expect(code).toMatch(/const \w+ = languageModel\(/);
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

				// Should generate subnodes config with variable references
				expect(code).toContain('subnodes:');
				// Should have variable declarations for subnodes
				expect(code).toMatch(/const \w+ = languageModel\(/);
				expect(code).toMatch(/const \w+ = tool\(/);
				// Should have 2 tool variable declarations
				expect((code.match(/const \w+ = tool\(/g) ?? []).length).toBe(2);
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
				// memory() should be a variable declaration
				expect(code).toMatch(/const \w+ = memory\(/);
			});
		});

		describe('fan-out patterns', () => {
			it('generates plain array for fan-out without merge', () => {
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

				// Should use plain array syntax for parallel targets
				expect(code).toContain('.to([');
				expect(code).toContain('Target1');
				expect(code).toContain('Target2');
				// Should NOT have sequential chaining between targets
				expect(code).not.toMatch(/Target1.*\.then.*Target2/s);
			});

			it('generates plain array for fan-out with downstream chains', () => {
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

				// Should use plain array syntax for parallel targets
				expect(code).toContain('.to([');
				// All three branches should be present
				expect(code).toContain('Instagram');
				expect(code).toContain('YouTube');
				expect(code).toContain('TikTok');
				// Instagram branch should have downstream chain to IG Analytics
				expect(code).toContain('IG Analytics');
			});
		});

		describe('composite node parameters roundtrip', () => {
			// Ensure fixtures are extracted for tests that use real workflow files
			beforeAll(() => {
				ensureFixtures();
			});

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

			it('preserves ifElse parameters through roundtrip', () => {
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
				const jsonPath = path.join(__dirname, '../../test-fixtures/real-workflows/5755.json');
				// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Test fixture file
				const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as WorkflowJSON;

				// Find the Animation Completed? node in original
				const originalNode = json.nodes.find((n) => n.name === 'Animation Completed?');
				expect(originalNode?.type).toBe('n8n-nodes-base.if');
				expect(originalNode?.parameters).toBeDefined();

				// Generate and parse back to JSON
				const code = generateFromWorkflow(json);
				const parsedJson = parseWorkflowCode(code);

				// Find the Animation Completed? node in parsed output
				const parsedNode = parsedJson.nodes.find((n) => n.name === 'Animation Completed?');

				// Verify parameters are preserved
				expect(parsedNode).toBeDefined();
				expect(parsedNode?.parameters).toBeDefined();
				expect(parsedNode?.parameters?.conditions).toBeDefined();
			});

			it('preserves ifElse parameters with cycle pattern (like workflow 5755)', () => {
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
			it('preserves merge node outgoing connections when merge has .to()', () => {
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

			it('emits merge downstream as builder-level .to() not nested inside .add()', () => {
				const json: WorkflowJSON = {
					id: 'merge-downstream-format',
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
							name: 'Branch A',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '3',
							name: 'Branch B',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '4',
							name: 'Combine',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [400, 0],
							parameters: { numberInputs: 2 },
						},
						{
							id: '5',
							name: 'Process Result',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [600, 0],
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
						'Branch A': { main: [[{ node: 'Combine', type: 'main', index: 0 }]] },
						'Branch B': { main: [[{ node: 'Combine', type: 'main', index: 1 }]] },
						Combine: { main: [[{ node: 'Process Result', type: 'main', index: 0 }]] },
					},
				};

				const code = generateFromWorkflow(json);

				// Merge downstream should use builder-level: .add(combine)\n  .to(process_Result)
				// NOT nested: .add(combine.to(process_Result))
				expect(code).toMatch(/\.add\(combine\)\s*\n\s*\.to\(process_Result\)/);
				expect(code).not.toContain('.add(combine.to(');
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
				// Pattern: trigger → Wait 1 → Wait 2 → splitInBatches with .each().to() chain
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
				// outer_sib.each().to(A.to(B.to(Wait1.to(Wait2.to(inner_sib.each()...)))))
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

		describe('execution context annotations', () => {
			it('adds output property with schema data on nodes with execution schema', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const nodeSchemas = new Map([
					[
						'Fetch Users',
						{
							type: 'object' as const,
							path: '',
							value: [
								{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' },
								{ type: 'string' as const, key: 'name', value: 'John', path: 'name' },
							],
						},
					],
				]);

				const code = generateCode(tree, json, graph, { nodeSchemas });

				// Should have output property with redacted values (strings→''), not @output JSDoc
				expect(code).not.toContain('@output');
				expect(code).toContain("output: [{ id: '', name: '' }]");
			});

			it('adds @nodeExecutionStatus success/error annotations in JSDoc', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Success Node',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Error Node',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const nodeExecutionStatus = new Map([
					['Success Node', { status: 'success' as const }],
					['Error Node', { status: 'error' as const, errorMessage: 'Something went wrong' }],
				]);

				const code = generateCode(tree, json, graph, { nodeExecutionStatus });

				expect(code).toContain('@nodeExecutionStatus success');
				expect(code).toContain('@nodeExecutionStatus error - Something went wrong');
			});

			it('adds @example comments for expression values', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								fields: {
									values: [{ name: 'greeting', stringValue: '={{ $json.name }}' }],
								},
							},
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const expressionAnnotations = new Map([['={{ $json.name }}', '"John Doe"']]);

				const code = generateCode(tree, json, graph, { expressionAnnotations });

				expect(code).toContain('/** @example "John Doe" */');
			});

			it('places block comment on line before expression value', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								// Expression is first, followed by another property
								expressionField: '={{ $json.name }}',
								staticField: 'static value',
							},
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const expressionAnnotations = new Map([['={{ $json.name }}', '"John Doe"']]);

				const code = generateCode(tree, json, graph, { expressionAnnotations });

				// Block comment should be on line before the expression
				expect(code).toContain('/** @example "John Doe" */');
				expect(code).toContain("expr('{{ $json.name }}')");
			});

			it('uses multi-line format when expression annotations are present', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								mode: 'manual',
								fields: {
									values: [{ name: 'greeting', stringValue: '={{ $json.name }}' }],
								},
							},
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const expressionAnnotations = new Map([['={{ $json.name }}', '"John Doe"']]);

				const code = generateCode(tree, json, graph, { expressionAnnotations });

				// Config should be multi-line when it contains comments
				expect(code).toMatch(/config: \{\n/);
				// Parameters object should also be multi-line
				expect(code).toMatch(/parameters: \{\n/);
			});

			it('does not add multiple commas for nested objects with expression annotations', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								fields: {
									values: [{ name: 'greeting', stringValue: '={{ $json.name }}' }],
								},
								otherField: 'static',
							},
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const expressionAnnotations = new Map([['={{ $json.name }}', '"John Doe"']]);

				const code = generateCode(tree, json, graph, { expressionAnnotations });

				// Should have exactly ONE comma before comment, not multiple
				expect(code).not.toMatch(/,,,/);
				expect(code).not.toMatch(/,,/);
			});

			it('adds comma after nested object containing expression annotations when followed by sibling property', () => {
				// This reproduces the bug where:
				// assignments: { assignments: [...expression with comment...] }
				// includeOtherFields: false  <-- missing comma before this line
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Edit Fields',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								mode: 'manual',
								duplicateItem: false,
								assignments: {
									assignments: [
										{
											id: 'test-id',
											name: 'valid_key',
											value: '={{ $json.name }}',
											type: 'string',
										},
									],
								},
								includeOtherFields: false,
								options: {},
							},
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const expressionAnnotations = new Map([['={{ $json.name }}', '"John Doe"']]);

				const code = generateCode(tree, json, graph, { expressionAnnotations });

				// The generated code should be valid JavaScript - try parsing it
				// If there's a missing comma, this regex will match
				// Pattern: closing brace } followed by newline and identifier (missing comma)
				const missingCommaPattern = /\}\s*\n\s*[a-zA-Z_][a-zA-Z0-9_]*:/;
				expect(code).not.toMatch(missingCommaPattern);

				// Also verify the structure is correct: after assignments object, there should be a comma
				expect(code).toMatch(/assignments:\s*\{[\s\S]*?\}\s*,\s*\n/);
			});

			it('adds workflow-level execution status JSDoc above export default workflow()', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);
				const tree = buildCompositeTree(graph);

				const workflowStatusJSDoc = '@lastExecuted "Trigger"\n@workflowExecutionStatus success';

				const code = generateCode(tree, json, graph, { workflowStatusJSDoc });

				// JSDoc should appear before export default wf
				expect(code).toMatch(
					/\/\*\*[\s\S]*@lastExecuted "Trigger"[\s\S]*@workflowExecutionStatus success[\s\S]*\*\/\s*export default wf/,
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

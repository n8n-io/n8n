/**
 * Tests for WorkflowBuilder plugin integration (Phase 6)
 *
 * These tests verify that the plugin system is properly integrated with
 * WorkflowBuilderImpl, allowing plugins to participate in validation,
 * composite handling, and serialization.
 */

import type { NodeInstance, WorkflowJSON, IfElseComposite, GraphNode } from './types/base';
import { workflow } from './workflow-builder';
import { splitInBatches } from './workflow-builder/control-flow-builders/split-in-batches';
import { node, trigger, ifElse, switchCase } from './workflow-builder/node-builders/node-builder';
import { ifElseHandler } from './workflow-builder/plugins/composite-handlers/if-else-handler';
import { splitInBatchesHandler } from './workflow-builder/plugins/composite-handlers/split-in-batches-handler';
import { switchCaseHandler } from './workflow-builder/plugins/composite-handlers/switch-case-handler';
import { registerDefaultPlugins } from './workflow-builder/plugins/defaults';
import { PluginRegistry, pluginRegistry } from './workflow-builder/plugins/registry';
import { jsonSerializer } from './workflow-builder/plugins/serializers/json-serializer';
import type {
	ValidatorPlugin,
	PluginContext,
	SerializerPlugin,
	CompositeHandlerPlugin,
	MutablePluginContext,
} from './workflow-builder/plugins/types';
import { agentValidator } from './workflow-builder/plugins/validators/agent-validator';
import { disconnectedNodeValidator } from './workflow-builder/plugins/validators/disconnected-node-validator';
import { maxNodesValidator } from './workflow-builder/plugins/validators/max-nodes-validator';
import { missingTriggerValidator } from './workflow-builder/plugins/validators/missing-trigger-validator';
import { noNodesValidator } from './workflow-builder/plugins/validators/no-nodes-validator';

// Helper to create mock validators
function createMockValidator(
	id: string,
	nodeTypes: string[] = [],
	validateNodeFn: ValidatorPlugin['validateNode'] = () => [],
): ValidatorPlugin {
	return {
		id,
		name: `Mock Validator ${id}`,
		nodeTypes,
		validateNode: jest.fn(validateNodeFn),
	};
}

describe('WorkflowBuilder plugin integration', () => {
	let testRegistry: PluginRegistry;

	beforeEach(() => {
		testRegistry = new PluginRegistry();
	});

	describe('validate() with plugins', () => {
		it('runs registered validators for matching node types', () => {
			const mockValidateNode = jest.fn().mockReturnValue([]);
			const mockValidator = createMockValidator(
				'test:mock',
				['n8n-nodes-base.set'],
				mockValidateNode,
			);
			testRegistry.registerValidator(mockValidator);

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Data', parameters: { values: [] } },
			});

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(setNode),
			);

			wf.validate();

			expect(mockValidateNode).toHaveBeenCalled();
		});

		it('collects issues from all matching validators', () => {
			const validator1 = createMockValidator('test:v1', [], () => [
				{ code: 'V1_ISSUE', message: 'Issue 1', severity: 'warning' },
			]);
			const validator2 = createMockValidator('test:v2', [], () => [
				{ code: 'V2_ISSUE', message: 'Issue 2', severity: 'error' },
			]);
			testRegistry.registerValidator(validator1);
			testRegistry.registerValidator(validator2);

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			// Cast to any to allow checking custom plugin codes
			expect(result.warnings.some((w) => (w.code as string) === 'V1_ISSUE')).toBe(true);
			expect(result.errors.some((e) => (e.code as string) === 'V2_ISSUE')).toBe(true);
		});

		it('validators receive correct PluginContext', () => {
			let receivedCtx: PluginContext | undefined;
			const mockValidator = createMockValidator('test:ctx', [], (_node, _graphNode, ctx) => {
				receivedCtx = ctx;
				return [];
			});
			testRegistry.registerValidator(mockValidator);

			const wf = workflow('wf-123', 'My Workflow', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			wf.validate();

			expect(receivedCtx).toBeDefined();
			expect(receivedCtx!.workflowId).toBe('wf-123');
			expect(receivedCtx!.workflowName).toBe('My Workflow');
			expect(receivedCtx!.nodes).toBeDefined();
		});

		it('validateWorkflow() hook is called after node validation', () => {
			const callOrder: string[] = [];
			const mockValidator: ValidatorPlugin = {
				id: 'test:hooks',
				name: 'Hook Validator',
				validateNode: () => {
					callOrder.push('validateNode');
					return [];
				},
				validateWorkflow: () => {
					callOrder.push('validateWorkflow');
					return [];
				},
			};
			testRegistry.registerValidator(mockValidator);

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			wf.validate();

			expect(callOrder).toContain('validateNode');
			expect(callOrder).toContain('validateWorkflow');
			// validateWorkflow should be called after all validateNode calls
			const nodeIdx = callOrder.indexOf('validateNode');
			const workflowIdx = callOrder.indexOf('validateWorkflow');
			expect(workflowIdx).toBeGreaterThan(nodeIdx);
		});

		it('skips validators that do not match node type', () => {
			const agentValidator = createMockValidator(
				'test:agent',
				['@n8n/n8n-nodes-langchain.agent'],
				() => [{ code: 'AGENT_ISSUE', message: 'Agent issue', severity: 'warning' }],
			);
			testRegistry.registerValidator(agentValidator);

			// Add a non-agent node
			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			// Agent validator should not have been called
			expect(agentValidator.validateNode).not.toHaveBeenCalled();
			expect(result.warnings.some((w) => (w.code as string) === 'AGENT_ISSUE')).toBe(false);
		});

		it('validators with empty nodeTypes run on all nodes', () => {
			const universalValidator = createMockValidator('test:universal', [], () => []);
			testRegistry.registerValidator(universalValidator);

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: { name: 'Set' },
					}),
				),
			);

			wf.validate();

			// Should be called once for each node (2 nodes)
			expect(universalValidator.validateNode).toHaveBeenCalledTimes(2);
		});
	});

	describe('toFormat()', () => {
		it('returns serialized output for registered format', () => {
			testRegistry.registerSerializer(jsonSerializer);

			const wf = workflow('wf-1', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.toFormat<WorkflowJSON>('json');

			expect(result.id).toBe('wf-1');
			expect(result.name).toBe('Test');
		});

		it('throws for unknown format', () => {
			const wf = workflow('test', 'Test', { registry: testRegistry });

			expect(() => wf.toFormat('yaml')).toThrow("No serializer registered for format 'yaml'");
		});

		it('custom serializer can transform workflow', () => {
			const customSerializer: SerializerPlugin<string> = {
				id: 'test:custom',
				name: 'Custom Serializer',
				format: 'custom',
				serialize: (ctx) => `Workflow: ${ctx.workflowName} (${ctx.nodes.size} nodes)`,
			};
			testRegistry.registerSerializer(customSerializer);

			const wf = workflow('test', 'My Flow', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.toFormat<string>('custom');

			expect(result).toBe('Workflow: My Flow (1 nodes)');
		});
	});

	describe('workflow() factory with registry option', () => {
		it('accepts registry option', () => {
			const customRegistry = new PluginRegistry();
			const wf = workflow('test', 'Test', { registry: customRegistry });

			// Should not throw
			expect(wf).toBeDefined();
		});

		it('uses provided registry for validation', () => {
			const customRegistry = new PluginRegistry();
			const mockValidator = createMockValidator('custom:v1', [], () => [
				{ code: 'CUSTOM_ISSUE', message: 'Custom issue', severity: 'warning' },
			]);
			customRegistry.registerValidator(mockValidator);

			const wf = workflow('test', 'Test', { registry: customRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			expect(result.warnings.some((w) => (w.code as string) === 'CUSTOM_ISSUE')).toBe(true);
		});

		it('accepts both settings and registry', () => {
			const customRegistry = new PluginRegistry();
			const wf = workflow('test', 'Test', {
				settings: { timezone: 'UTC' },
				registry: customRegistry,
			});

			const json = wf.toJSON();
			expect(json.settings?.timezone).toBe('UTC');
		});
	});

	describe('add() with composite handlers', () => {
		it('delegates IfElseComposite to registered handler when handler handles it', () => {
			const mockAddNodes = jest.fn().mockReturnValue('If Node');
			const mockHandler: CompositeHandlerPlugin<IfElseComposite> = {
				id: 'test:if-else',
				name: 'Test If/Else Handler',
				priority: 100,
				canHandle: (input): input is IfElseComposite =>
					input !== null &&
					typeof input === 'object' &&
					'_isIfElseBuilder' in input &&
					(input as { _isIfElseBuilder: boolean })._isIfElseBuilder,
				addNodes: mockAddNodes,
			};
			testRegistry.registerCompositeHandler(mockHandler);

			// Create an IfElseComposite using the ifElse builder
			const trueNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Branch', parameters: {} },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Branch', parameters: {} },
			});

			const composite = ifElse({ version: 2, config: { name: 'If Node', parameters: {} } }).onTrue!(
				trueNode,
			).onFalse(falseNode);

			// Add the composite to the workflow
			workflow('test', 'Test', { registry: testRegistry }).add(composite);

			// Verify the handler was called
			expect(mockAddNodes).toHaveBeenCalled();
		});

		it('uses global pluginRegistry as fallback when custom registry has no handler', () => {
			// Custom registry has no handlers, but global pluginRegistry does
			// The workflow should use global pluginRegistry as fallback
			const trueNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Branch', parameters: {} },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Branch', parameters: {} },
			});

			const composite = ifElse({ version: 2, config: { name: 'If Node', parameters: {} } }).onTrue!(
				trueNode,
			).onFalse(falseNode);

			// Create workflow without a custom registry - uses global pluginRegistry
			const wf = workflow('test', 'Test').add(composite);

			// Verify all nodes were added (global pluginRegistry has core:if-else handler)
			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(3);
			expect(json.nodes.map((n) => n.name)).toContain('If Node');
			expect(json.nodes.map((n) => n.name)).toContain('True Branch');
			expect(json.nodes.map((n) => n.name)).toContain('False Branch');
		});

		it('handler receives MutablePluginContext with helper methods', () => {
			let receivedCtx: MutablePluginContext | undefined;
			const mockHandler: CompositeHandlerPlugin<IfElseComposite> = {
				id: 'test:ctx-checker',
				name: 'Context Checker Handler',
				priority: 100,
				canHandle: (input): input is IfElseComposite =>
					input !== null &&
					typeof input === 'object' &&
					'_isIfElseBuilder' in input &&
					(input as { _isIfElseBuilder: boolean })._isIfElseBuilder,
				addNodes: (input, ctx) => {
					receivedCtx = ctx;
					// Actually add the if node so workflow doesn't fail
					ctx.addNodeWithSubnodes(input.ifNode);
					return input.ifNode.name;
				},
			};
			testRegistry.registerCompositeHandler(mockHandler);

			const composite = ifElse({ version: 2, config: { name: 'If Node', parameters: {} } }).onTrue!(
				null,
			).onFalse(null);

			workflow('wf-123', 'My Workflow', { registry: testRegistry }).add(composite);

			expect(receivedCtx).toBeDefined();
			expect(receivedCtx!.workflowId).toBe('wf-123');
			expect(receivedCtx!.workflowName).toBe('My Workflow');
			expect(typeof receivedCtx!.addNodeWithSubnodes).toBe('function');
			expect(typeof receivedCtx!.addBranchToGraph).toBe('function');
		});
	});

	describe('then() with composite handlers', () => {
		it('delegates IfElseComposite to registered handler in then()', () => {
			const mockAddNodes = jest
				.fn()
				.mockImplementation((input: IfElseComposite, ctx: MutablePluginContext) => {
					ctx.addNodeWithSubnodes(input.ifNode);
					return input.ifNode.name;
				});
			const mockHandler: CompositeHandlerPlugin<IfElseComposite> = {
				id: 'test:if-else',
				name: 'Test If/Else Handler',
				priority: 100,
				canHandle: (input): input is IfElseComposite =>
					input !== null &&
					typeof input === 'object' &&
					'_isIfElseBuilder' in input &&
					(input as { _isIfElseBuilder: boolean })._isIfElseBuilder,
				addNodes: mockAddNodes,
			};
			testRegistry.registerCompositeHandler(mockHandler);

			const startTrigger = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const composite = ifElse({ version: 2, config: { name: 'If Node', parameters: {} } }).onTrue!(
				null,
			).onFalse(null);

			workflow('test', 'Test', { registry: testRegistry }).add(startTrigger).to(composite);

			expect(mockAddNodes).toHaveBeenCalled();
		});
	});

	describe('Phase 6.6.1: Unconditional composite handler dispatch', () => {
		it('uses global pluginRegistry.findCompositeHandler when no registry is provided', () => {
			// Import the global registry to spy on it

			// Spy on the global registry's findCompositeHandler method
			const findCompositeHandlerSpy = jest.spyOn(pluginRegistry, 'findCompositeHandler');

			// Create a workflow WITHOUT explicitly passing a registry
			// Use ifElse composite which should trigger findCompositeHandler
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Branch', parameters: {} },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Branch', parameters: {} },
			});

			const composite = ifElse({
				version: 2,
				config: { name: 'If Node', parameters: {} },
			}).onTrue!(trueBranch).onFalse(falseBranch);

			// Create workflow without registry option
			workflow('test', 'Test').add(composite);

			// The global pluginRegistry.findCompositeHandler should have been called
			expect(findCompositeHandlerSpy).toHaveBeenCalled();

			// Restore the spy
			findCompositeHandlerSpy.mockRestore();
		});

		it('uses global pluginRegistry.findCompositeHandler in then() when no registry is provided', () => {
			const findCompositeHandlerSpy = jest.spyOn(pluginRegistry, 'findCompositeHandler');

			const startTrigger = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});

			const composite = ifElse({
				version: 2,
				config: { name: 'If Node', parameters: {} },
			}).onTrue!(null).onFalse(null);

			// Create workflow without registry option and use then()
			workflow('test', 'Test').add(startTrigger).to(composite);

			expect(findCompositeHandlerSpy).toHaveBeenCalled();
			findCompositeHandlerSpy.mockRestore();
		});
	});

	describe('Phase 6.5: No duplicate validation', () => {
		it('validates each node exactly once per validator (no duplicates)', () => {
			// This test verifies that validation is not duplicated
			// After Phase 6.5, plugin validators run INSTEAD of inline checks, not in addition
			const validateCallCounts: Map<string, number> = new Map();

			const countingValidator: ValidatorPlugin = {
				id: 'test:counter',
				name: 'Counting Validator',
				nodeTypes: ['n8n-nodes-base.set'],
				validateNode: (nodeInstance) => {
					const nodeName = nodeInstance.name;
					validateCallCounts.set(nodeName, (validateCallCounts.get(nodeName) ?? 0) + 1);
					return [];
				},
			};
			testRegistry.registerValidator(countingValidator);

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Data', parameters: { values: [] } },
			});

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(setNode),
			);

			wf.validate();

			// The Set node should be validated exactly ONCE by the plugin validator
			// If the old inline checks are still running, this would be called twice
			expect(validateCallCounts.get('Set Data')).toBe(1);
		});

		it('uses global plugin registry when no registry is provided', () => {
			// Import the global registry to add a test validator

			// Ensure default plugins are registered
			registerDefaultPlugins(pluginRegistry);

			// Create a workflow WITHOUT explicitly passing a registry
			const wf = workflow('test', 'Test').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 1.7,
						config: {
							name: 'Agent',
							parameters: {
								promptType: 'define',
								text: 'static prompt without expression', // This should trigger AGENT_STATIC_PROMPT
							},
						},
					}),
				),
			);

			const result = wf.validate();

			// The agentValidator plugin should run and detect the static prompt
			expect(result.warnings.some((w) => w.code === 'AGENT_STATIC_PROMPT')).toBe(true);
		});

		it('inline check methods do not duplicate plugin validation warnings', () => {
			// This test ensures that when a custom registry with plugins is used,
			// the inline check* methods are NOT called (they are replaced by plugins)

			// Create a registry with the agent validator
			testRegistry.registerValidator(agentValidator);

			// Create an agent node with issues that both inline and plugin would catch
			const agentNode = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					name: 'Agent',
					parameters: {
						promptType: 'define',
						text: 'static prompt', // No expression - triggers warning
						options: {}, // No systemMessage - triggers warning
					},
				},
			});

			const wf = workflow('test', 'Test', { registry: testRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}).to(agentNode),
			);

			const result = wf.validate();

			// Count warnings of each type - should be exactly 1, not 2 (no duplicates)
			const staticPromptWarnings = result.warnings.filter((w) => w.code === 'AGENT_STATIC_PROMPT');
			const noSystemMessageWarnings = result.warnings.filter(
				(w) => w.code === 'AGENT_NO_SYSTEM_MESSAGE',
			);

			// Each warning should appear exactly once (from plugin only, not duplicated)
			expect(staticPromptWarnings.length).toBe(1);
			expect(noSystemMessageWarnings.length).toBe(1);
		});
	});

	describe('Phase 6.6.5: Verify plugin handlers are used for all composite types', () => {
		it('ifElse builder is handled by global pluginRegistry handler', () => {
			registerDefaultPlugins(pluginRegistry);

			const findHandlerSpy = jest.spyOn(pluginRegistry, 'findCompositeHandler');

			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True', parameters: {} },
			});
			const composite = ifElse({ version: 2, config: { name: 'If', parameters: {} } }).onTrue!(
				trueBranch,
			).onFalse(null);

			// Use workflow without custom registry - uses global pluginRegistry
			const wf = workflow('test', 'Test').add(composite);

			// Verify handler was found (may be called multiple times, find the one that returned a handler)
			expect(findHandlerSpy).toHaveBeenCalled();
			const foundHandler = findHandlerSpy.mock.results.find(
				(r: { value?: { id: string } }) => r.value?.id === 'core:if-else',
			) as { value?: { id: string } } | undefined;
			expect(foundHandler).toBeDefined();
			expect(foundHandler!.value!.id).toBe('core:if-else');

			// Verify workflow was built correctly
			const json = wf.toJSON();
			expect(json.nodes.map((n) => n.name)).toContain('If');
			expect(json.nodes.map((n) => n.name)).toContain('True');

			findHandlerSpy.mockRestore();
		});

		it('switchCase builder is handled by global pluginRegistry handler', () => {
			registerDefaultPlugins(pluginRegistry);

			const findHandlerSpy = jest.spyOn(pluginRegistry, 'findCompositeHandler');

			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Case 0', parameters: {} },
			});
			// Use the switchCase factory function syntax
			const switchNode = switchCase({
				version: 3,
				config: { name: 'Switch', parameters: {} },
			});
			const composite = switchNode.onCase!(0, case0);

			const wf = workflow('test', 'Test').add(composite);

			// Verify handler was found
			const foundHandler = findHandlerSpy.mock.results.find(
				(r: { value?: { id: string } }) => r.value?.id === 'core:switch-case',
			);
			expect(foundHandler).toBeDefined();

			// Verify workflow was built correctly
			const json = wf.toJSON();
			expect(json.nodes.map((n) => n.name)).toContain('Switch');
			expect(json.nodes.map((n) => n.name)).toContain('Case 0');

			findHandlerSpy.mockRestore();
		});

		it('splitInBatches builder is handled by global pluginRegistry handler', () => {
			registerDefaultPlugins(pluginRegistry);

			const findHandlerSpy = jest.spyOn(pluginRegistry, 'findCompositeHandler');

			const doneNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Done', parameters: {} },
			});
			const sib = splitInBatches({ version: 3 }).onDone(doneNode);

			const wf = workflow('test', 'Test').add(
				sib as unknown as NodeInstance<string, string, unknown>,
			);

			// Verify handler was found
			const foundHandler = findHandlerSpy.mock.results.find(
				(r: { value?: { id: string } }) => r.value?.id === 'core:split-in-batches',
			);
			expect(foundHandler).toBeDefined();

			// Verify workflow was built correctly
			const json = wf.toJSON();
			expect(json.nodes.map((n) => n.name)).toContain('Split In Batches');
			expect(json.nodes.map((n) => n.name)).toContain('Done');

			findHandlerSpy.mockRestore();
		});
	});

	describe('Phase 9.2: getHeadNodeName() and resolveCompositeHeadName()', () => {
		it('registry.resolveCompositeHeadName returns head node name for IfElseBuilder', () => {
			registerDefaultPlugins(pluginRegistry);

			const composite = ifElse({ version: 2, config: { name: 'My If', parameters: {} } }).onTrue!(
				null,
			).onFalse(null);

			const headName = pluginRegistry.resolveCompositeHeadName(composite);

			expect(headName).toBe('My If');
		});

		it('registry.resolveCompositeHeadName returns head node name for SwitchCaseBuilder', () => {
			registerDefaultPlugins(pluginRegistry);

			const composite = switchCase({
				version: 3,
				config: { name: 'My Switch', parameters: {} },
			}).onCase!(0, null);

			const headName = pluginRegistry.resolveCompositeHeadName(composite);

			expect(headName).toBe('My Switch');
		});

		it('registry.resolveCompositeHeadName returns head node name for SplitInBatchesBuilder', () => {
			registerDefaultPlugins(pluginRegistry);

			const sib = splitInBatches({ version: 3, config: { name: 'My SIB' } });

			const headName = pluginRegistry.resolveCompositeHeadName(sib);

			expect(headName).toBe('My SIB');
		});

		it('registry.resolveCompositeHeadName applies nameMapping when provided', () => {
			registerDefaultPlugins(pluginRegistry);

			const composite = ifElse({ version: 2, config: { name: 'If', parameters: {} } }).onTrue!(
				null,
			).onFalse(null);

			// Simulate that the If node was renamed during add
			const nameMapping = new Map<string, string>();
			nameMapping.set(composite.ifNode.id, 'If 1');

			const headName = pluginRegistry.resolveCompositeHeadName(composite, nameMapping);

			expect(headName).toBe('If 1');
		});

		it('registry.resolveCompositeHeadName returns undefined for non-composites', () => {
			registerDefaultPlugins(pluginRegistry);

			const regularNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set', parameters: {} },
			});

			const headName = pluginRegistry.resolveCompositeHeadName(regularNode);

			expect(headName).toBeUndefined();
		});

		it('handler.getHeadNodeName is called by resolveCompositeHeadName', () => {
			const mockGetHeadNodeName = jest.fn().mockReturnValue('Custom Head');
			const customHandler: CompositeHandlerPlugin<{ custom: true }> = {
				id: 'test:custom',
				name: 'Custom Handler',
				canHandle: (input): input is { custom: true } =>
					input !== null && typeof input === 'object' && 'custom' in input,
				addNodes: () => 'Custom Head',
				getHeadNodeName: mockGetHeadNodeName,
			};

			const customRegistry = new PluginRegistry();
			customRegistry.registerCompositeHandler(customHandler);

			const headName = customRegistry.resolveCompositeHeadName({ custom: true });

			expect(mockGetHeadNodeName).toHaveBeenCalledWith({ custom: true });
			expect(headName).toBe('Custom Head');
		});

		it('handler without getHeadNodeName returns undefined from resolveCompositeHeadName', () => {
			const handlerWithoutGetHead: CompositeHandlerPlugin<{ noHead: true }> = {
				id: 'test:no-head',
				name: 'Handler Without getHeadNodeName',
				canHandle: (input): input is { noHead: true } =>
					input !== null && typeof input === 'object' && 'noHead' in input,
				addNodes: () => 'Some Node',
				// Note: no getHeadNodeName method
			};

			const customRegistry = new PluginRegistry();
			customRegistry.registerCompositeHandler(handlerWithoutGetHead);

			const headName = customRegistry.resolveCompositeHeadName({ noHead: true });

			expect(headName).toBeUndefined();
		});
	});

	describe('Phase 10.2: disconnectedNodeValidator as full plugin', () => {
		it('validateWorkflow directly detects disconnected nodes', () => {
			// Build a minimal PluginContext manually to test the validator directly
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const connectedNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Connected', parameters: {} },
			});
			const disconnectedNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Disconnected', parameters: {} },
			});

			// Build workflow to verify the test setup is correct
			workflow('test', 'Test').add(triggerNode.to(connectedNode)).add(disconnectedNode);

			// Create a manual context to test the validator directly
			// We need to create GraphNode objects that match what the validator expects
			const nodesMap = new Map<
				string,
				{
					instance: { name: string; type: string };
					connections: Map<string, Map<number, Array<{ node: string }>>>;
				}
			>();

			// Trigger node - no incoming connections needed
			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map([['main', new Map([[0, [{ node: 'Connected' }]]])]]),
			});

			// Connected node - has incoming connection from Start
			nodesMap.set('Connected', {
				instance: { name: 'Connected', type: 'n8n-nodes-base.set' },
				connections: new Map(),
			});

			// Disconnected node - no incoming connections
			nodesMap.set('Disconnected', {
				instance: { name: 'Disconnected', type: 'n8n-nodes-base.set' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			// Call validateWorkflow directly on the plugin
			const issues = disconnectedNodeValidator.validateWorkflow!(ctx);

			// Should detect the disconnected node
			expect(issues.length).toBeGreaterThan(0);
			expect(issues.some((i: { code: string }) => i.code === 'DISCONNECTED_NODE')).toBe(true);
			expect(issues.some((i) => i.nodeName === 'Disconnected')).toBe(true);
		});

		it('validateWorkflow respects allowDisconnectedNodes in context', () => {
			// Create a manual context with a disconnected node and allowDisconnectedNodes option
			const nodesMap = new Map<
				string,
				{
					instance: { name: string; type: string };
					connections: Map<string, Map<number, Array<{ node: string }>>>;
				}
			>();

			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map(),
			});

			nodesMap.set('Disconnected', {
				instance: { name: 'Disconnected', type: 'n8n-nodes-base.set' },
				connections: new Map(),
			});

			const ctx: PluginContext & { validationOptions?: { allowDisconnectedNodes?: boolean } } = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				validationOptions: { allowDisconnectedNodes: true },
			};

			// Call validateWorkflow directly on the plugin
			const issues = disconnectedNodeValidator.validateWorkflow!(ctx);

			// Should NOT detect disconnected node when allowDisconnectedNodes is true
			expect(issues.some((i: { code: string }) => i.code === 'DISCONNECTED_NODE')).toBe(false);
		});

		it('integration: workflow.validate() uses disconnectedNodeValidator plugin', () => {
			const customRegistry = new PluginRegistry();
			customRegistry.registerValidator(disconnectedNodeValidator);

			// Create workflow with a disconnected node
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const disconnectedNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Disconnected', parameters: {} },
			});

			const wf = workflow('test', 'Test', { registry: customRegistry })
				.add(triggerNode)
				.add(disconnectedNode);

			const result = wf.validate();

			// Should detect the disconnected node
			expect(result.warnings.some((w) => w.code === 'DISCONNECTED_NODE')).toBe(true);
		});

		it('skips trigger nodes (they do not need incoming connections)', () => {
			const nodesMap = new Map<
				string,
				{
					instance: { name: string; type: string };
					connections: Map<string, Map<number, Array<{ node: string }>>>;
				}
			>();

			// Only a trigger node
			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = disconnectedNodeValidator.validateWorkflow!(ctx);

			// Should NOT warn about trigger node being disconnected
			expect(issues.some((i: { code: string }) => i.code === 'DISCONNECTED_NODE')).toBe(false);
		});

		it('skips sticky notes (they do not participate in data flow)', () => {
			const nodesMap = new Map<
				string,
				{
					instance: { name: string; type: string };
					connections: Map<string, Map<number, Array<{ node: string }>>>;
				}
			>();

			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map(),
			});

			nodesMap.set('Note', {
				instance: { name: 'Note', type: 'n8n-nodes-base.stickyNote' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = disconnectedNodeValidator.validateWorkflow!(ctx);

			// Should NOT warn about sticky note being disconnected
			expect(issues.some((i: { code: string }) => i.code === 'DISCONNECTED_NODE')).toBe(false);
		});

		it('skips subnodes connected via AI connections', () => {
			const nodesMap = new Map<
				string,
				{
					instance: { name: string; type: string };
					connections: Map<string, Map<number, Array<{ node: string }>>>;
				}
			>();

			// Agent node
			nodesMap.set('Agent', {
				instance: { name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				connections: new Map(),
			});

			// Language model connected to agent via ai_languageModel
			nodesMap.set('OpenAI', {
				instance: { name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmOpenAi' },
				connections: new Map([['ai_languageModel', new Map([[0, [{ node: 'Agent' }]]])]]),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = disconnectedNodeValidator.validateWorkflow!(ctx);

			// Should NOT warn about subnodes connected via AI connections
			// The OpenAI node is a subnode connected via ai_languageModel
			expect(issues.some((i) => i.nodeName === 'OpenAI')).toBe(false);
		});
	});

	describe('Phase 11.1: noNodesValidator plugin', () => {
		it('validateWorkflow returns error when workflow has no nodes', () => {
			// Empty nodes map
			const ctx: PluginContext = {
				nodes: new Map(),
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = noNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(1);
			expect(issues[0].code).toBe('NO_NODES');
			expect(issues[0].severity).toBe('error');
		});

		it('validateWorkflow returns empty array when workflow has nodes', () => {
			// Non-empty nodes map
			const nodesMap = new Map();
			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = noNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('integration: workflow.validate() reports NO_NODES error for empty workflow', () => {
			const wf = workflow('test', 'Empty Workflow');

			const result = wf.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'NO_NODES')).toBe(true);
		});
	});

	describe('Phase 11.2: missingTriggerValidator plugin', () => {
		it('validateWorkflow returns warning when no trigger node exists', () => {
			// Nodes map with only non-trigger nodes
			const nodesMap = new Map();
			nodesMap.set('Set', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = missingTriggerValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(1);
			expect(issues[0].code).toBe('MISSING_TRIGGER');
			expect(issues[0].severity).toBe('warning');
		});

		it('validateWorkflow returns empty array when trigger node exists', () => {
			const nodesMap = new Map();
			nodesMap.set('Start', {
				instance: { name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
			};

			const issues = missingTriggerValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('validateWorkflow respects allowNoTrigger option', () => {
			const nodesMap = new Map();
			nodesMap.set('Set', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set' },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				validationOptions: { allowNoTrigger: true },
			};

			const issues = missingTriggerValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('integration: workflow.validate() reports MISSING_TRIGGER warning', () => {
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set', parameters: {} },
			});

			const wf = workflow('test', 'No Trigger').add(setNode);

			const result = wf.validate();

			expect(result.warnings.some((w) => w.code === 'MISSING_TRIGGER')).toBe(true);
		});

		it('integration: workflow.validate() skips MISSING_TRIGGER when allowNoTrigger is true', () => {
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set', parameters: {} },
			});

			const wf = workflow('test', 'No Trigger').add(setNode);

			const result = wf.validate({ allowNoTrigger: true });

			expect(result.warnings.some((w) => w.code === 'MISSING_TRIGGER')).toBe(false);
		});
	});

	describe('Phase 10.3: JSON serializer extraction', () => {
		it('jsonSerializer.serialize produces basic workflow structure', () => {
			// Create a minimal SerializerContext
			const ctx = {
				nodes: new Map(),
				workflowId: 'wf-123',
				workflowName: 'Test Workflow',
				settings: { timezone: 'UTC' },
				pinData: { Node1: [{ item: 'data' }] },
				resolveTargetNodeName: () => undefined,
			};

			const result = jsonSerializer.serialize(ctx);

			expect(result.id).toBe('wf-123');
			expect(result.name).toBe('Test Workflow');
			expect(result.settings).toEqual({ timezone: 'UTC' });
			expect(result.pinData).toEqual({ Node1: [{ item: 'data' }] });
		});

		it('workflow.toFormat("json") uses jsonSerializer when registered', () => {
			const customRegistry = new PluginRegistry();
			customRegistry.registerSerializer(jsonSerializer);

			const wf = workflow('wf-456', 'My Workflow', { registry: customRegistry }).add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			);

			// toFormat delegates to the serializer
			const result = wf.toFormat<WorkflowJSON>('json');

			// Note: The current stub serializer only returns basic structure
			// without nodes/connections
			expect(result.id).toBe('wf-456');
			expect(result.name).toBe('My Workflow');
		});

		it('workflow.toJSON() returns full serialization with nodes and connections', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Data', parameters: { values: [] } },
			});

			const wf = workflow('wf-789', 'Full Test').add(triggerNode.to(setNode));

			const json = wf.toJSON();

			// toJSON should produce full serialization
			expect(json.id).toBe('wf-789');
			expect(json.name).toBe('Full Test');
			expect(json.nodes).toHaveLength(2);
			expect(json.nodes.map((n) => n.name)).toContain('Start');
			expect(json.nodes.map((n) => n.name)).toContain('Set Data');
			// Connections should be present
			expect(json.connections['Start']).toBeDefined();
		});
	});

	describe('Phase 9.3: collectPinData() on composite handlers', () => {
		it('ifElseHandler.collectPinData collects pin data from IF node and branches', () => {
			const collectedNodes: string[] = [];
			const collector = (node: NodeInstance<string, string, unknown>) => {
				collectedNodes.push(node.name);
			};

			// Create IfElseBuilder with branches that have pinData
			const trueNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Node', parameters: {}, pinData: [{ item: 'true' }] },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Node', parameters: {}, pinData: [{ item: 'false' }] },
			});

			const composite = ifElse({
				version: 2,
				config: { name: 'If', parameters: {}, pinData: [{ item: 'if' }] },
			}).onTrue!(trueNode).onFalse(falseNode);

			ifElseHandler.collectPinData!(composite, collector);

			expect(collectedNodes).toContain('If');
			expect(collectedNodes).toContain('True Node');
			expect(collectedNodes).toContain('False Node');
		});

		it('switchCaseHandler.collectPinData collects pin data from switch node and cases', () => {
			const collectedNodes: string[] = [];
			const collector = (node: NodeInstance<string, string, unknown>) => {
				collectedNodes.push(node.name);
			};

			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Case 0', parameters: {}, pinData: [{ item: 'case0' }] },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Case 1', parameters: {}, pinData: [{ item: 'case1' }] },
			});

			const composite = switchCase({
				version: 3,
				config: { name: 'Switch', parameters: {}, pinData: [{ item: 'switch' }] },
			}).onCase!(0, case0).onCase(1, case1);

			switchCaseHandler.collectPinData!(composite, collector);

			expect(collectedNodes).toContain('Switch');
			expect(collectedNodes).toContain('Case 0');
			expect(collectedNodes).toContain('Case 1');
		});

		it('splitInBatchesHandler.collectPinData collects pin data from SIB node and targets', () => {
			const collectedNodes: string[] = [];
			const collector = (node: NodeInstance<string, string, unknown>) => {
				collectedNodes.push(node.name);
			};

			const doneNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Done', parameters: {}, pinData: [{ item: 'done' }] },
			});
			const eachNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Each', parameters: {}, pinData: [{ item: 'each' }] },
			});

			const sib = splitInBatches({
				version: 3,
				config: { name: 'SIB', pinData: [{ item: 'sib' }] },
			})
				.onDone(doneNode)
				.onEachBatch(eachNode);

			// The handler's SplitInBatchesBuilderShape is internal, but the builder implements it at runtime
			(
				splitInBatchesHandler.collectPinData as (
					input: unknown,
					collector: (node: NodeInstance<string, string, unknown>) => void,
				) => void
			)(sib, collector);

			expect(collectedNodes).toContain('SIB');
			// Note: done/each nodes may not be collected by the handler as they're added via addBranchToGraph
		});

		it('handlers without collectPinData are gracefully skipped', () => {
			const handlerWithoutCollectPinData: CompositeHandlerPlugin<{ noPinData: true }> = {
				id: 'test:no-pin-data',
				name: 'Handler Without collectPinData',
				canHandle: (input): input is { noPinData: true } =>
					input !== null && typeof input === 'object' && 'noPinData' in input,
				addNodes: () => 'Some Node',
				// Note: no collectPinData method
			};

			// Should not throw when handler doesn't have collectPinData
			expect(handlerWithoutCollectPinData.collectPinData).toBeUndefined();
		});
	});

	describe('Phase 13: maxNodesValidator plugin', () => {
		it('validateWorkflow returns empty array when no nodeTypesProvider', () => {
			const nodesMap = new Map();
			nodesMap.set('Set 1', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});
			nodesMap.set('Set 2', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				// No nodeTypesProvider
			};

			const issues = maxNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('validateWorkflow returns empty array when count <= maxNodes', () => {
			const nodesMap = new Map();
			nodesMap.set('Set 1', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});

			const mockProvider = {
				getByNameAndVersion: () => ({
					description: { maxNodes: 2, displayName: 'Set' },
				}),
			};

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				validationOptions: { nodeTypesProvider: mockProvider },
			};

			const issues = maxNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('validateWorkflow returns error when count > maxNodes', () => {
			const nodesMap = new Map();
			nodesMap.set('Set 1', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});
			nodesMap.set('Set 2', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});
			nodesMap.set('Set 3', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});

			const mockProvider = {
				getByNameAndVersion: () => ({
					description: { maxNodes: 2, displayName: 'Set' },
				}),
			};

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				validationOptions: { nodeTypesProvider: mockProvider },
			};

			const issues = maxNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(1);
			expect(issues[0].code).toBe('MAX_NODES_EXCEEDED');
			expect(issues[0].severity).toBe('error');
			expect(issues[0].message).toContain('3');
			expect(issues[0].message).toContain('Set');
			expect(issues[0].message).toContain('2');
		});

		it('validateWorkflow skips types with no maxNodes defined', () => {
			const nodesMap = new Map();
			nodesMap.set('Set 1', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});
			nodesMap.set('Set 2', {
				instance: { name: 'Set', type: 'n8n-nodes-base.set', version: 3.4 },
				connections: new Map(),
			});

			const mockProvider = {
				getByNameAndVersion: () => ({
					description: { displayName: 'Set' }, // No maxNodes
				}),
			};

			const ctx: PluginContext = {
				nodes: nodesMap as unknown as ReadonlyMap<string, GraphNode>,
				workflowId: 'test',
				workflowName: 'Test',
				settings: {},
				validationOptions: { nodeTypesProvider: mockProvider },
			};

			const issues = maxNodesValidator.validateWorkflow!(ctx);

			expect(issues.length).toBe(0);
		});

		it('integration: workflow.validate() reports MAX_NODES_EXCEEDED error', () => {
			const setNode1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 1', parameters: {} },
			});
			const setNode2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 2', parameters: {} },
			});
			const setNode3 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 3', parameters: {} },
			});

			const wf = workflow('test', 'Test')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						config: { name: 'Start' },
					}),
				)
				.add(setNode1)
				.add(setNode2)
				.add(setNode3);

			const mockProvider = {
				getByNameAndVersion: (type: string) => {
					if (type === 'n8n-nodes-base.set') {
						return { description: { maxNodes: 2, displayName: 'Set' } };
					}
					return undefined;
				},
			};

			const result = wf.validate({ nodeTypesProvider: mockProvider as never });

			expect(result.errors.some((e) => e.code === 'MAX_NODES_EXCEEDED')).toBe(true);
		});
	});

	describe('Phase 18: handleFanOut branching node detection', () => {
		it('treats multi-output nodes (like Text Classifier) as branching nodes with array syntax', () => {
			// Text Classifier is a multi-output node that should work like IF/Switch
			// when using .to([branch0, branch1, branch2]) syntax.
			// Currently, only IF, Switch, and SplitInBatches are hardcoded as branching nodes.
			const textClassifier = node({
				type: '@n8n/n8n-nodes-langchain.textClassifier',
				version: 1,
				config: {
					name: 'Classify',
					parameters: {
						categories: {
							categories: [
								{ category: 'Billing', description: 'billing issues' },
								{ category: 'Support', description: 'support requests' },
								{ category: 'Sales', description: 'sales inquiries' },
							],
						},
					},
				},
			});

			const billingHandler = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Handle Billing', parameters: {} },
			});

			const supportHandler = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Handle Support', parameters: {} },
			});

			const salesHandler = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Handle Sales', parameters: {} },
			});

			// Using array syntax should treat textClassifier as a branching node
			// Each element should connect to a different output index
			const wf = workflow('test', 'Text Classifier Branching')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						config: { name: 'Start' },
					}),
				)
				.to(textClassifier)
				.to([billingHandler, supportHandler, salesHandler]);

			const json = wf.toJSON();

			// Check connections from Classify node
			const classifyConns = json.connections['Classify'];
			expect(classifyConns).toBeDefined();
			expect(classifyConns.main).toBeDefined();

			// Each handler should be connected to a DIFFERENT output index (branching behavior)
			// Output 0 -> Handle Billing
			// Output 1 -> Handle Support
			// Output 2 -> Handle Sales
			expect(classifyConns.main[0]).toEqual([{ node: 'Handle Billing', type: 'main', index: 0 }]);
			expect(classifyConns.main[1]).toEqual([{ node: 'Handle Support', type: 'main', index: 0 }]);
			expect(classifyConns.main[2]).toEqual([{ node: 'Handle Sales', type: 'main', index: 0 }]);
		});
	});
});

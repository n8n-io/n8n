/**
 * Test that the public API exports are accessible
 */
import { PluginRegistry, pluginRegistry, registerDefaultPlugins, workflow } from '../../index';
import type {
	ValidationIssue,
	PluginContext,
	MutablePluginContext,
	ValidatorPlugin,
	CompositeHandlerPlugin,
	SerializerPlugin,
	WorkflowBuilderOptions,
} from '../../index';

describe('Public API exports', () => {
	describe('Registry exports', () => {
		it('exports PluginRegistry class', () => {
			expect(PluginRegistry).toBeDefined();
			expect(typeof PluginRegistry).toBe('function');
		});

		it('exports pluginRegistry singleton', () => {
			expect(pluginRegistry).toBeDefined();
			expect(pluginRegistry).toBeInstanceOf(PluginRegistry);
		});

		it('exports registerDefaultPlugins function', () => {
			expect(registerDefaultPlugins).toBeDefined();
			expect(typeof registerDefaultPlugins).toBe('function');
		});
	});

	describe('Type exports', () => {
		it('exports ValidatorPlugin type', () => {
			// TypeScript compilation test - if this compiles, types are exported
			const validator: ValidatorPlugin = {
				id: 'test',
				name: 'Test',
				validateNode: () => [],
			};
			expect(validator).toBeDefined();
		});

		it('exports CompositeHandlerPlugin type', () => {
			const handler: CompositeHandlerPlugin = {
				id: 'test',
				name: 'Test',
				canHandle: (_input: unknown): _input is unknown => false,
				addNodes: () => 'node',
			};
			expect(handler).toBeDefined();
		});

		it('exports SerializerPlugin type', () => {
			const serializer: SerializerPlugin = {
				id: 'test',
				name: 'Test',
				format: 'test',
				serialize: () => ({}),
			};
			expect(serializer).toBeDefined();
		});

		it('exports ValidationIssue type', () => {
			const issue: ValidationIssue = {
				code: 'TEST',
				message: 'Test message',
				severity: 'error',
			};
			expect(issue).toBeDefined();
		});

		it('exports PluginContext type', () => {
			const ctx: PluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test',
				settings: {},
			};
			expect(ctx).toBeDefined();
		});

		it('exports MutablePluginContext type', () => {
			const ctx: MutablePluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test',
				settings: {},
				addNodeWithSubnodes: () => undefined,
				addBranchToGraph: () => 'node',
			};
			expect(ctx).toBeDefined();
		});

		it('exports WorkflowBuilderOptions type', () => {
			const options: WorkflowBuilderOptions = {
				settings: { timezone: 'UTC' },
				registry: new PluginRegistry(),
			};
			expect(options).toBeDefined();
		});
	});

	describe('Workflow with registry', () => {
		it('workflow() accepts WorkflowBuilderOptions with registry', () => {
			const registry = new PluginRegistry();
			const wf = workflow('test', 'Test', { registry });
			expect(wf).toBeDefined();
			expect(wf.id).toBe('test');
		});

		it('workflow() accepts WorkflowBuilderOptions with settings and registry', () => {
			const registry = new PluginRegistry();
			const wf = workflow('test', 'Test', {
				settings: { timezone: 'UTC' },
				registry,
			});
			expect(wf).toBeDefined();
			expect(wf.toJSON().settings?.timezone).toBe('UTC');
		});
	});

	describe('Integration', () => {
		it('can create a registry and register default plugins', () => {
			const registry = new PluginRegistry();
			registerDefaultPlugins(registry);

			// Verify validators were registered
			const validators = registry.getValidators();
			expect(validators.length).toBeGreaterThan(0);

			// Verify composite handlers were registered
			const handlers = registry.getCompositeHandlers();
			expect(handlers.length).toBeGreaterThan(0);

			// Verify serializers were registered
			const jsonSerializer = registry.getSerializer('json');
			expect(jsonSerializer).toBeDefined();
		});
	});
});

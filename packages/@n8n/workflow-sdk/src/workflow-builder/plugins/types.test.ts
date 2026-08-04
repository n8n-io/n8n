import type {
	ValidatorPlugin,
	ValidationIssue,
	CompositeHandlerPlugin,
	SerializerPlugin,
	PluginContext,
	MutablePluginContext,
} from './types';

describe('Plugin Types', () => {
	describe('ValidatorPlugin interface', () => {
		it('requires id and name', () => {
			const validator: ValidatorPlugin = {
				id: 'test:validator',
				name: 'Test Validator',
				validateNode: () => [],
			};
			expect(validator.id).toBe('test:validator');
			expect(validator.name).toBe('Test Validator');
		});

		it('allows optional nodeTypes array', () => {
			const validator: ValidatorPlugin = {
				id: 'test:agent',
				name: 'Agent Validator',
				nodeTypes: ['@n8n/n8n-nodes-langchain.agent'],
				validateNode: () => [],
			};
			expect(validator.nodeTypes).toContain('@n8n/n8n-nodes-langchain.agent');
		});

		it('allows optional priority', () => {
			const validator: ValidatorPlugin = {
				id: 'test:priority',
				name: 'Priority Validator',
				priority: 100,
				validateNode: () => [],
			};
			expect(validator.priority).toBe(100);
		});

		it('allows optional validateWorkflow method', () => {
			const validator: ValidatorPlugin = {
				id: 'test:workflow',
				name: 'Workflow Validator',
				validateNode: () => [],
				validateWorkflow: () => [],
			};
			expect(validator.validateWorkflow).toBeDefined();
		});
	});

	describe('ValidationIssue interface', () => {
		it('requires code, message, severity', () => {
			const issue: ValidationIssue = {
				code: 'TEST_ERROR',
				message: 'Test message',
				severity: 'error',
			};
			expect(issue.code).toBe('TEST_ERROR');
			expect(issue.message).toBe('Test message');
			expect(issue.severity).toBe('error');
		});

		it('supports warning severity', () => {
			const issue: ValidationIssue = {
				code: 'TEST_WARNING',
				message: 'Test warning',
				severity: 'warning',
			};
			expect(issue.severity).toBe('warning');
		});

		it('allows optional nodeName', () => {
			const issue: ValidationIssue = {
				code: 'NODE_ERROR',
				message: 'Node error',
				severity: 'error',
				nodeName: 'Test Node',
			};
			expect(issue.nodeName).toBe('Test Node');
		});

		it('allows optional parameterPath', () => {
			const issue: ValidationIssue = {
				code: 'PARAM_ERROR',
				message: 'Parameter error',
				severity: 'error',
				parameterPath: 'parameters.url',
			};
			expect(issue.parameterPath).toBe('parameters.url');
		});
	});

	describe('CompositeHandlerPlugin interface', () => {
		it('requires id, name, canHandle, addNodes', () => {
			const handler: CompositeHandlerPlugin = {
				id: 'test:handler',
				name: 'Test Handler',
				canHandle: (input: unknown): input is object => typeof input === 'object',
				addNodes: () => 'node-name',
			};
			expect(handler.id).toBe('test:handler');
			expect(handler.name).toBe('Test Handler');
			expect(typeof handler.canHandle).toBe('function');
			expect(typeof handler.addNodes).toBe('function');
		});

		it('allows optional priority', () => {
			const handler: CompositeHandlerPlugin = {
				id: 'test:priority',
				name: 'Priority Handler',
				priority: 50,
				canHandle: (_input: unknown): _input is unknown => false,
				addNodes: () => 'node-name',
			};
			expect(handler.priority).toBe(50);
		});

		it('allows optional handleThen method', () => {
			const handler: CompositeHandlerPlugin = {
				id: 'test:then',
				name: 'Then Handler',
				canHandle: (_input: unknown): _input is unknown => false,
				addNodes: () => 'node-name',
				handleThen: (_input: unknown, currentNode: string, currentOutput: number) => ({
					currentNode,
					currentOutput,
				}),
			};
			expect(handler.handleThen).toBeDefined();
		});
	});

	describe('SerializerPlugin interface', () => {
		it('requires id, name, format, serialize', () => {
			const serializer: SerializerPlugin = {
				id: 'test:json',
				name: 'JSON Serializer',
				format: 'json',
				serialize: () => ({}),
			};
			expect(serializer.id).toBe('test:json');
			expect(serializer.name).toBe('JSON Serializer');
			expect(serializer.format).toBe('json');
			expect(typeof serializer.serialize).toBe('function');
		});
	});

	describe('PluginContext interface', () => {
		it('has required readonly properties', () => {
			const ctx: PluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test Workflow',
				settings: {},
			};
			expect(ctx.workflowId).toBe('wf-1');
			expect(ctx.workflowName).toBe('Test Workflow');
			expect(ctx.nodes).toBeInstanceOf(Map);
			expect(ctx.settings).toEqual({});
		});

		it('allows optional pinData', () => {
			const ctx: PluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test Workflow',
				settings: {},
				pinData: { 'Node 1': [{ key: 'value' }] },
			};
			expect(ctx.pinData).toBeDefined();
			expect(ctx.pinData?.['Node 1']).toEqual([{ key: 'value' }]);
		});
	});

	describe('MutablePluginContext interface', () => {
		it('extends PluginContext with mutable nodes', () => {
			const ctx: MutablePluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: () => 'node-id',
				addBranchToGraph: () => 'branch-head',
			};
			// Should be able to mutate nodes
			ctx.nodes.set('test', {} as never);
			expect(ctx.nodes.has('test')).toBe(true);
		});

		it('has addNodeWithSubnodes method', () => {
			const ctx: MutablePluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: () => 'new-node-id',
				addBranchToGraph: () => 'branch-head',
			};
			expect(typeof ctx.addNodeWithSubnodes).toBe('function');
		});

		it('has addBranchToGraph method', () => {
			const ctx: MutablePluginContext = {
				nodes: new Map(),
				workflowId: 'wf-1',
				workflowName: 'Test Workflow',
				settings: {},
				addNodeWithSubnodes: () => 'new-node-id',
				addBranchToGraph: () => 'branch-head',
			};
			expect(typeof ctx.addBranchToGraph).toBe('function');
		});
	});
});

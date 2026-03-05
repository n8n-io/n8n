import { workflow, trigger, node } from '../../../index';
import { jsonSerializer } from './json-serializer';
import type { SerializerContext } from '../types';

// Helper to create a mock serializer context
function createMockSerializerContext(
	overrides: Partial<SerializerContext> = {},
): SerializerContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
		resolveTargetNodeName: () => undefined,
		...overrides,
	};
}

describe('jsonSerializer', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(jsonSerializer.id).toBe('core:json');
		});

		it('has correct name', () => {
			expect(jsonSerializer.name).toBe('JSON Serializer');
		});

		it('format is json', () => {
			expect(jsonSerializer.format).toBe('json');
		});
	});

	describe('serialize', () => {
		it('returns WorkflowJSON with id and name', () => {
			const ctx = createMockSerializerContext({
				workflowId: 'wf-1',
				workflowName: 'My Workflow',
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.id).toBe('wf-1');
			expect(result.name).toBe('My Workflow');
		});

		it('includes settings in output', () => {
			const ctx = createMockSerializerContext({
				settings: { timezone: 'UTC', executionTimeout: 300 },
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.settings).toEqual({ timezone: 'UTC', executionTimeout: 300 });
		});

		it('includes pinData in output when present', () => {
			const ctx = createMockSerializerContext({
				pinData: { 'Node 1': [{ key: 'value' }] },
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.pinData).toEqual({ 'Node 1': [{ key: 'value' }] });
		});

		it('excludes pinData from output when not present', () => {
			const ctx = createMockSerializerContext({
				pinData: undefined,
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.pinData).toBeUndefined();
		});

		it('returns empty nodes array when no nodes', () => {
			const ctx = createMockSerializerContext({
				nodes: new Map(),
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.nodes).toEqual([]);
		});

		it('returns empty connections object when no nodes', () => {
			const ctx = createMockSerializerContext({
				nodes: new Map(),
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.connections).toEqual({});
		});
	});

	describe('WorkflowBuilder parameter resolution', () => {
		it('serializes WorkflowBuilder parameter values to JSON strings', () => {
			const subWf = workflow('sub', 'Sub Workflow').add(
				trigger({
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					version: 1.1,
					config: { parameters: { inputSource: 'passthrough' } },
				}),
			);

			const wf = workflow('main', 'Main').add(
				node({
					type: 'n8n-nodes-base.executeWorkflow',
					version: 1.3,
					config: {
						name: 'Run Sub',
						parameters: {
							source: 'parameter',
							workflowJson: subWf,
						},
					},
				}),
			);

			const json = wf.toJSON();
			const execNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflow');
			expect(execNode).toBeDefined();
			expect(typeof execNode!.parameters!.workflowJson).toBe('string');
			const parsed = JSON.parse(execNode!.parameters!.workflowJson as string);
			expect(parsed.nodes).toBeDefined();
			expect(parsed.connections).toBeDefined();
		});

		it('preserves non-WorkflowBuilder parameter values unchanged', () => {
			const wf = workflow('main', 'Main').add(
				node({
					type: 'n8n-nodes-base.executeWorkflow',
					version: 1.3,
					config: {
						name: 'Run Sub',
						parameters: {
							source: 'parameter',
							workflowJson: '{"nodes":[],"connections":{}}',
						},
					},
				}),
			);

			const json = wf.toJSON();
			const execNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflow');
			expect(execNode!.parameters!.workflowJson).toBe('{"nodes":[],"connections":{}}');
		});
	});
});

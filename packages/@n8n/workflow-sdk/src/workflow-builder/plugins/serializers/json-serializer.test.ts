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
});

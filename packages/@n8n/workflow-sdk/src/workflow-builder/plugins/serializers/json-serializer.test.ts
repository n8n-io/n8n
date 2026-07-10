import { jsonSerializer } from './json-serializer';
import type { GraphNode } from '../../../types/base';
import { node, trigger } from '../../node-builders/node-builder';
import { generateDeterministicGroupId } from '../../string-utils';
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

		it('serializes nodes without configured parameters with an empty parameters object', () => {
			const manualTrigger = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Manual Trigger' },
			});
			const ctx = createMockSerializerContext({
				nodes: new Map<string, GraphNode>([
					['Manual Trigger', { instance: manualTrigger, connections: new Map() }],
				]),
			});

			const result = jsonSerializer.serialize(ctx);

			expect(result.nodes[0]?.parameters).toEqual({});
		});

		describe('node groups', () => {
			it('omits nodeGroups when the context has none', () => {
				const result = jsonSerializer.serialize(createMockSerializerContext());

				expect(result.nodeGroups).toBeUndefined();
			});

			it('derives a deterministic id when a group carries none and no name matches', () => {
				const ctx = createMockSerializerContext({
					workflowId: 'wf-1',
					nodeGroups: [{ name: 'G', memberIds: [] }],
				});

				const result = jsonSerializer.serialize(ctx);

				expect(result.nodeGroups).toEqual([
					{ id: generateDeterministicGroupId('wf-1', 'G'), name: 'G', nodeIds: [] },
				]);
			});

			it('reuses an existing id matched by name when the group carries none', () => {
				const ctx = createMockSerializerContext({
					nodeGroups: [{ name: 'G', memberIds: [] }],
					existingGroupIdsByName: new Map([['G', 'ui-id']]),
				});

				const result = jsonSerializer.serialize(ctx);

				expect(result.nodeGroups![0].id).toBe('ui-id');
			});

			it("prefers the group's own id over a name match", () => {
				const ctx = createMockSerializerContext({
					nodeGroups: [{ id: 'carried-id', name: 'G', memberIds: [] }],
					existingGroupIdsByName: new Map([['G', 'ui-id']]),
				});

				const result = jsonSerializer.serialize(ctx);

				expect(result.nodeGroups![0].id).toBe('carried-id');
			});

			it('drops member ids that are not present in the emitted nodes', () => {
				const fetch = node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: { name: 'Fetch' },
				});
				const ctx = createMockSerializerContext({
					nodes: new Map<string, GraphNode>([
						['Fetch', { instance: fetch, connections: new Map() }],
					]),
					nodeGroups: [{ name: 'G', memberIds: [fetch.id, 'ghost-id'] }],
				});

				const result = jsonSerializer.serialize(ctx);

				expect(result.nodeGroups![0].nodeIds).toEqual([fetch.id]);
			});
		});
	});
});

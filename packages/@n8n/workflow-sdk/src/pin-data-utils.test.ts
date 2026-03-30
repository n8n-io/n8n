import type { INode, INodeExecutionData, IPinData } from 'n8n-workflow';
import { HTTP_REQUEST_NODE_TYPE } from 'n8n-workflow';

import {
	needsPinData,
	discoverOutputSchemaForNode,
	inferSchemasFromRunData,
	normalizePinData,
} from './pin-data-utils';

// Mock the generate-types module used by discoverOutputSchemaForNode
const mockDiscoverSchemasForNode = jest.fn();
const mockFindSchemaForOperation = jest.fn();
const mockGenerateJsonSchemaFromData = jest.fn();

jest.mock('./generate-types', () => ({
	discoverSchemasForNode: (...args: unknown[]) => mockDiscoverSchemasForNode(...args) as unknown,
	findSchemaForOperation: (...args: unknown[]) => mockFindSchemaForOperation(...args) as unknown,
	generateJsonSchemaFromData: (...args: unknown[]) =>
		mockGenerateJsonSchemaFromData(...args) as unknown,
}));

function createNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Test Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...overrides,
	} as INode;
}

describe('needsPinData', () => {
	it('returns false for a plain logic node without trigger check', () => {
		const node = createNode({ type: 'n8n-nodes-base.set' });
		expect(needsPinData(node)).toBe(false);
	});

	it('returns true when isTriggerNode callback returns true', () => {
		const node = createNode({ type: 'n8n-nodes-base.webhook' });
		expect(needsPinData(node, () => true)).toBe(true);
	});

	it('returns false when isTriggerNode callback returns false and no other criteria match', () => {
		const node = createNode({ type: 'n8n-nodes-base.set' });
		expect(needsPinData(node, () => false)).toBe(false);
	});

	it('returns true for nodes with credentials', () => {
		const node = createNode({
			type: 'n8n-nodes-base.slack',
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		expect(needsPinData(node)).toBe(true);
	});

	it('returns false for nodes with empty credentials object', () => {
		const node = createNode({
			type: 'n8n-nodes-base.slack',
			credentials: {},
		});
		expect(needsPinData(node)).toBe(false);
	});

	it('returns true for HTTP Request nodes', () => {
		const node = createNode({ type: HTTP_REQUEST_NODE_TYPE });
		expect(needsPinData(node)).toBe(true);
	});

	it('returns true for HTTP Request nodes even when isTriggerNode returns false', () => {
		const node = createNode({ type: HTTP_REQUEST_NODE_TYPE });
		expect(needsPinData(node, () => false)).toBe(true);
	});

	it('returns true for credential nodes even when isTriggerNode is not provided', () => {
		const node = createNode({
			credentials: { someApi: { id: '1', name: 'cred' } },
		});
		expect(needsPinData(node)).toBe(true);
	});
});

describe('discoverOutputSchemaForNode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns undefined for empty node type', () => {
		expect(discoverOutputSchemaForNode('', 1)).toBeUndefined();
	});

	it('returns undefined when no schemas are discovered', () => {
		mockDiscoverSchemasForNode.mockReturnValue([]);
		expect(discoverOutputSchemaForNode('n8n-nodes-base.slack', 1)).toBeUndefined();
	});

	it('uses findSchemaForOperation when resource/operation are provided', () => {
		const schema = { type: 'object', properties: { id: { type: 'string' } } };
		mockDiscoverSchemasForNode.mockReturnValue([
			{ resource: 'message', operation: 'post', schema },
		]);
		mockFindSchemaForOperation.mockReturnValue({ schema });

		const result = discoverOutputSchemaForNode('n8n-nodes-base.slack', 1, {
			resource: 'message',
			operation: 'post',
		});

		expect(result).toEqual(schema);
		expect(mockFindSchemaForOperation).toHaveBeenCalledWith(expect.any(Array), 'message', 'post');
	});

	it('returns single schema when only one exists and no resource/operation', () => {
		const schema = { type: 'object', properties: { val: { type: 'number' } } };
		mockDiscoverSchemasForNode.mockReturnValue([{ schema }]);

		const result = discoverOutputSchemaForNode('n8n-nodes-base.httpRequest', 4);

		expect(result).toEqual(schema);
		expect(mockFindSchemaForOperation).not.toHaveBeenCalled();
	});

	it('returns undefined when multiple schemas exist and no resource/operation', () => {
		mockDiscoverSchemasForNode.mockReturnValue([
			{ schema: { type: 'object' } },
			{ schema: { type: 'object' } },
		]);

		const result = discoverOutputSchemaForNode('n8n-nodes-base.slack', 1);
		expect(result).toBeUndefined();
	});

	it('returns undefined when findSchemaForOperation returns no match', () => {
		mockDiscoverSchemasForNode.mockReturnValue([
			{ resource: 'channel', operation: 'list', schema: {} },
		]);
		mockFindSchemaForOperation.mockReturnValue(undefined);

		const result = discoverOutputSchemaForNode('n8n-nodes-base.slack', 1, {
			resource: 'message',
			operation: 'post',
		});
		expect(result).toBeUndefined();
	});
});

describe('inferSchemasFromRunData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns empty object for empty run data', () => {
		expect(inferSchemasFromRunData({})).toEqual({});
	});

	it('skips nodes with no data items', () => {
		const result = inferSchemasFromRunData({
			EmptyNode: [],
		});
		expect(result).toEqual({});
	});

	it('skips nodes with empty json', () => {
		mockGenerateJsonSchemaFromData.mockReturnValue({ type: 'object', properties: {} });

		const result = inferSchemasFromRunData({
			EmptyJsonNode: [{ json: {} } as INodeExecutionData],
		});
		expect(result).toEqual({});
		expect(mockGenerateJsonSchemaFromData).not.toHaveBeenCalled();
	});

	it('infers schema from first item json', () => {
		const schema = { type: 'object', properties: { id: { type: 'string' } } };
		mockGenerateJsonSchemaFromData.mockReturnValue(schema);

		const result = inferSchemasFromRunData({
			SlackNode: [{ json: { id: '123', channel: 'general' } } as unknown as INodeExecutionData],
		});

		expect(result).toEqual({ SlackNode: schema });
		expect(mockGenerateJsonSchemaFromData).toHaveBeenCalledWith({ id: '123', channel: 'general' });
	});

	it('processes multiple nodes', () => {
		const schema1 = { type: 'object', properties: { a: { type: 'string' } } };
		const schema2 = { type: 'object', properties: { b: { type: 'number' } } };
		mockGenerateJsonSchemaFromData.mockReturnValueOnce(schema1).mockReturnValueOnce(schema2);

		const result = inferSchemasFromRunData({
			Node1: [{ json: { a: 'hello' } } as unknown as INodeExecutionData],
			Node2: [{ json: { b: 42 } } as unknown as INodeExecutionData],
		});

		expect(result).toEqual({ Node1: schema1, Node2: schema2 });
	});
});

describe('normalizePinData', () => {
	it('passes through items already wrapped in json property', () => {
		const pinData: IPinData = {
			Trigger: [{ json: { id: '123', name: 'test' } }],
		};

		const result = normalizePinData(pinData);

		expect(result).toEqual({
			Trigger: [{ json: { id: '123', name: 'test' } }],
		});
	});

	it('wraps flat objects in json property', () => {
		const pinData = {
			Trigger: [{ id: '123', name: 'test' }],
		} as unknown as IPinData;

		const result = normalizePinData(pinData);

		expect(result).toEqual({
			Trigger: [{ json: { id: '123', name: 'test' } }],
		});
	});

	it('handles mixed items (some wrapped, some flat)', () => {
		const pinData = {
			Node1: [{ json: { wrapped: true } }, { flat: true }],
		} as unknown as IPinData;

		const result = normalizePinData(pinData);

		expect(result).toEqual({
			Node1: [{ json: { wrapped: true } }, { json: { flat: true } }],
		});
	});

	it('handles empty pin data', () => {
		expect(normalizePinData({})).toEqual({});
	});

	it('handles multiple nodes', () => {
		const pinData: IPinData = {
			Node1: [{ json: { a: 1 } }],
			Node2: [{ json: { b: 2 } }],
		};

		const result = normalizePinData(pinData);

		expect(result).toEqual({
			Node1: [{ json: { a: 1 } }],
			Node2: [{ json: { b: 2 } }],
		});
	});

	it('wraps items where json is null', () => {
		const pinData = {
			Node1: [{ json: null }],
		} as unknown as IPinData;

		const result = normalizePinData(pinData);

		expect(result).toEqual({
			Node1: [{ json: { json: null } }],
		});
	});
});

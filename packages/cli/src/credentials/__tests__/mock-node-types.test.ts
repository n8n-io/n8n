import type { INodeType } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';

import { createMockNodeTypes } from '../mock-node-types';

describe('createMockNodeTypes', () => {
	it('returns no known types', () => {
		const { nodeTypes } = createMockNodeTypes();

		expect(nodeTypes.getKnownTypes()).toEqual({});
	});

	it('resolves the mock node type by name and by name and version', () => {
		const { nodeTypes } = createMockNodeTypes();

		expect(nodeTypes.getByName('mock')).toEqual({ description: { properties: [] } });
		expect(nodeTypes.getByNameAndVersion('mock')).toEqual({
			description: { properties: [], version: undefined },
		});
	});

	it('returns undefined for an unknown node type', () => {
		const { nodeTypes } = createMockNodeTypes();

		expect(nodeTypes.getByName('unknown')).toBeUndefined();
	});

	it('throws for an unknown node type when a version is resolved', () => {
		const { nodeTypes } = createMockNodeTypes();

		expect(() => nodeTypes.getByNameAndVersion('unknown')).toThrow(UnexpectedError);
		expect(() => nodeTypes.getByNameAndVersion('unknown')).toThrow(RESPONSE_ERROR_MESSAGES.NO_NODE);
	});

	it('resolves node types added to the backing registry', () => {
		const { nodesData, nodeTypes } = createMockNodeTypes();
		const type = { description: { name: 'extra', properties: [] } } as unknown as INodeType;

		nodesData.extra = { sourcePath: '', type };

		expect(nodeTypes.getByName('extra')).toBe(type);
	});

	it('gives each caller its own registry', () => {
		const first = createMockNodeTypes();
		const second = createMockNodeTypes();

		first.nodesData.extra = {
			sourcePath: '',
			type: { description: { name: 'extra', properties: [] } } as unknown as INodeType,
		};

		expect(second.nodeTypes.getByName('extra')).toBeUndefined();
	});
});

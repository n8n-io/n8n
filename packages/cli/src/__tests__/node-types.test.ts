import { mock } from 'jest-mock-extended';
import type { INodeType, IVersionedNodeType } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { NodeTypes } from '../node-types';

describe('NodeTypes', () => {
	let nodeTypes: NodeTypes;
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	beforeEach(() => {
		jest.clearAllMocks();
		nodeTypes = new NodeTypes(loadNodesAndCredentials);
	});

	describe('getByNameAndVersion', () => {
		const nodeTypeName = 'n8n-nodes-base.testNode';

		it('should throw an error if the node-type does not exist', () => {
			const nodeTypeName = 'unknownNode';

			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.loadedNodes = {};
			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.knownNodes = {};

			expect(() => nodeTypes.getByNameAndVersion(nodeTypeName)).toThrow(
				'Unrecognized node type: unknownNode',
			);
		});

		it('should return a regular node-type without version', () => {
			const nodeType = mock<INodeType>();

			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.loadedNodes = {
				[nodeTypeName]: { type: nodeType },
			};

			const result = nodeTypes.getByNameAndVersion(nodeTypeName);

			expect(result).toEqual(nodeType);
		});

		it('should return a regular node-type with version', () => {
			const nodeTypeV1 = mock<INodeType>();
			const nodeType = mock<IVersionedNodeType>({
				nodeVersions: { 1: nodeTypeV1 },
				getNodeType: () => nodeTypeV1,
			});

			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.loadedNodes = {
				[nodeTypeName]: { type: nodeType },
			};

			const result = nodeTypes.getByNameAndVersion(nodeTypeName);

			expect(result).toEqual(nodeTypeV1);
		});

		it('should throw when a node-type is requested as tool, but does not support being used as one', () => {
			const nodeType = mock<INodeType>();

			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.loadedNodes = {
				[nodeTypeName]: { type: nodeType },
			};

			expect(() => nodeTypes.getByNameAndVersion(`${nodeTypeName}Tool`)).toThrow(
				'Node cannot be used as a tool',
			);
		});

		it('should return the tool node-type when requested as tool', () => {
			const nodeType = mock<INodeType>();
			// @ts-expect-error can't use a mock here
			nodeType.description = {
				name: nodeTypeName,
				displayName: 'TestNode',
				usableAsTool: true,
				properties: [],
			};

			// @ts-expect-error overwriting a readonly property
			loadNodesAndCredentials.loadedNodes = {
				[nodeTypeName]: { type: nodeType },
			};

			const result = nodeTypes.getByNameAndVersion(`${nodeTypeName}Tool`);
			expect(result).not.toEqual(nodeType);
			expect(result.description.name).toEqual('n8n-nodes-base.testNodeTool');
			expect(result.description.displayName).toEqual('TestNode Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
		});
	});
});

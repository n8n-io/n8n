import { mock } from 'jest-mock-extended';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	LoadedClass,
	INodeType,
	IVersionedNodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

describe('NodeTypes', () => {
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const nodeTypes: NodeTypes = new NodeTypes(loadNodesAndCredentials);

	const nonVersionedNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.nonVersioned',
				usableAsTool: undefined,
			}),
		},
	};
	const v1Node = mock<INodeType>();
	const v2Node = mock<INodeType>();
	const versionedNode: LoadedClass<IVersionedNodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.versioned',
			}),
			currentVersion: 2,
			nodeVersions: {
				1: v1Node,
				2: v2Node,
			},
			getNodeType(version) {
				if (version === 1) return v1Node;
				return v2Node;
			},
		},
	};
	const toolSupportingNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.testNode',
				displayName: 'TestNode',
				usableAsTool: true,
				properties: [],
			}),
		},
	};

	loadNodesAndCredentials.getNode.mockImplementation((fullNodeType) => {
		const [packageName, nodeType] = fullNodeType.split('.');
		if (nodeType === 'nonVersioned') return nonVersionedNode;
		if (nodeType === 'versioned') return versionedNode;
		if (nodeType === 'testNode') return toolSupportingNode;
		throw new UnrecognizedNodeTypeError(packageName, nodeType);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getByName', () => {
		it('should return node type when it exists', () => {
			const result = nodeTypes.getByName('n8n-nodes-base.nonVersioned');
			expect(result).toBe(nonVersionedNode.type);
		});
	});

	describe('getByNameAndVersion', () => {
		it('should throw an error if the package does not exist', () => {
			expect(() => nodeTypes.getByNameAndVersion('invalid-package.unknownNode')).toThrow(
				'Unrecognized node type: invalid-package.unknownNode',
			);
		});

		it('should throw an error if the node-type does not exist', () => {
			expect(() => nodeTypes.getByNameAndVersion('n8n-nodes-base.unknownNode')).toThrow(
				'Unrecognized node type: n8n-nodes-base.unknownNode',
			);
		});

		it('should return a regular node-type without version', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.nonVersioned');
			expect(result).toBe(nonVersionedNode.type);
		});

		it('should return a regular node-type with version', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.versioned');
			expect(result).toBe(v2Node);
		});

		it('should throw when a node-type is requested as tool, but does not support being used as one', () => {
			expect(() => nodeTypes.getByNameAndVersion('n8n-nodes-base.nonVersionedTool')).toThrow(
				'Node cannot be used as a tool',
			);
		});

		it('should return the tool node-type when requested as tool', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.testNodeTool');
			expect(result).not.toEqual(toolSupportingNode);
			expect(result.description.name).toEqual('n8n-nodes-base.testNodeTool');
			expect(result.description.displayName).toEqual('TestNode Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
		});
	});

	describe('getWithSourcePath', () => {
		it('should return description and source path for existing node', () => {
			const result = nodeTypes.getWithSourcePath('n8n-nodes-base.nonVersioned', 1);
			expect(result).toHaveProperty('description');
			expect(result).toHaveProperty('sourcePath');
			expect(result.sourcePath).toBe(nonVersionedNode.sourcePath);
		});

		it('should throw error for non-existent node', () => {
			expect(() => nodeTypes.getWithSourcePath('n8n-nodes-base.nonExistent', 1)).toThrow(
				'Unrecognized node type: n8n-nodes-base.nonExistent',
			);
		});
	});

	describe('getKnownTypes', () => {
		it('should return known node types', () => {
			// @ts-expect-error readonly property
			loadNodesAndCredentials.knownNodes = ['n8n-nodes-base.nonVersioned'];
			const result = nodeTypes.getKnownTypes();
			expect(result).toEqual(['n8n-nodes-base.nonVersioned']);
		});
	});

	describe('getNodeTypeDescriptions', () => {
		it('should return descriptions for valid node types', () => {
			const nodeTypes = new NodeTypes(loadNodesAndCredentials);
			const result = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.nonVersioned', version: 1 },
			]);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('n8n-nodes-base.nonVersioned');
		});

		it('should throw error for invalid node type', () => {
			const nodeTypes = new NodeTypes(loadNodesAndCredentials);
			expect(() =>
				nodeTypes.getNodeTypeDescriptions([{ name: 'n8n-nodes-base.nonExistent', version: 1 }]),
			).toThrow('Unrecognized node type: n8n-nodes-base.nonExistent');
		});
	});
});

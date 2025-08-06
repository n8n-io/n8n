import { mock } from 'jest-mock-extended';
import { RoutingNode, UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	LoadedClass,
	INodeType,
	IVersionedNodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

describe('NodeTypes', () => {
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
		convertNodeToAiTool: LoadNodesAndCredentials.prototype.convertNodeToAiTool,
	});

	const nodeTypes: NodeTypes = new NodeTypes(loadNodesAndCredentials);

	const nonVersionedNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.nonVersioned',
				usableAsTool: undefined,
			}),
			supplyData: undefined,
		},
	};
	const v1Node = mock<INodeType>({ supplyData: undefined });
	const v2Node = mock<INodeType>({ supplyData: undefined });
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
	const toolNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.toolNode',
				displayName: 'TestNode',
				properties: [],
			}),
			supplyData: jest.fn(),
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
			supplyData: undefined,
		},
	};
	const declarativeNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.declarativeNode',
				displayName: 'Declarative Node',
				usableAsTool: true,
				properties: [],
			}),
			execute: undefined,
			poll: undefined,
			trigger: undefined,
			webhook: undefined,
			methods: undefined,
			supplyData: undefined,
		},
	};
	const communityNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: mock<INodeTypeDescription>({
				name: 'n8n-nodes-community.testNode',
				displayName: 'TestNode',
				usableAsTool: true,
				properties: [],
			}),
			supplyData: undefined,
		},
	};

	loadNodesAndCredentials.getNode.mockImplementation((fullNodeType) => {
		const [packageName, nodeType] = fullNodeType.split('.');
		if (packageName === 'n8n-nodes-base') {
			if (nodeType === 'nonVersioned') return nonVersionedNode;
			if (nodeType === 'versioned') return versionedNode;
			if (nodeType === 'testNode') return toolSupportingNode;
			if (nodeType === 'declarativeNode') return declarativeNode;
			if (nodeType === 'toolNode') return toolNode;
		} else if (fullNodeType === 'n8n-nodes-community.testNode') return communityNode;
		throw new UnrecognizedNodeTypeError(packageName, nodeType);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		loadNodesAndCredentials.loaded.nodes = {};
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

		it('should throw when a node-type is requested as tool, but the original node is already a tool', () => {
			expect(() => nodeTypes.getByNameAndVersion('n8n-nodes-base.toolNodeTool')).toThrow(
				'Node already has a `supplyData` method',
			);
		});

		it('should return the tool node-type when requested as tool', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.testNodeTool');
			expect(result).not.toEqual(toolSupportingNode.type);
			expect(result.description.name).toEqual('n8n-nodes-base.testNodeTool');
			expect(result.description.displayName).toEqual('TestNode Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
		});

		it('should return a tool node-type from a community node,  when requested as tool', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-community.testNodeTool');
			expect(result).not.toEqual(toolSupportingNode.type);
			expect(result.description.name).toEqual('n8n-nodes-community.testNodeTool');
			expect(result.description.displayName).toEqual('TestNode Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
		});

		it('should return a declarative node-type with an `.execute` method', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.declarativeNode');
			expect(result).toBe(declarativeNode.type);
			expect(result.execute).toBeDefined();

			const runNodeSpy = jest.spyOn(RoutingNode.prototype, 'runNode').mockResolvedValue([]);
			result.execute!.call(mock());
			expect(runNodeSpy).toHaveBeenCalled();
		});

		it('should return a declarative node-type as a tool with an `.execute` method', () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.declarativeNodeTool');
			expect(result).not.toEqual(declarativeNode.type);
			expect(result.description.name).toEqual('n8n-nodes-base.declarativeNodeTool');
			expect(result.description.displayName).toEqual('Declarative Node Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
			expect(result.execute).toBeDefined();

			const runNodeSpy = jest.spyOn(RoutingNode.prototype, 'runNode').mockResolvedValue([]);
			result.execute!.call(mock());
			expect(runNodeSpy).toHaveBeenCalled();
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
			const result = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.nonVersioned', version: 1 },
			]);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('n8n-nodes-base.nonVersioned');
		});

		it('should throw error for invalid node type', () => {
			expect(() =>
				nodeTypes.getNodeTypeDescriptions([{ name: 'n8n-nodes-base.nonExistent', version: 1 }]),
			).toThrow('Unrecognized node type: n8n-nodes-base.nonExistent');
		});
	});
});

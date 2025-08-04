'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
describe('NodeTypes', () => {
	const loadNodesAndCredentials = (0, jest_mock_extended_1.mock)({
		convertNodeToAiTool:
			load_nodes_and_credentials_1.LoadNodesAndCredentials.prototype.convertNodeToAiTool,
	});
	const nodeTypes = new node_types_1.NodeTypes(loadNodesAndCredentials);
	const nonVersionedNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
				name: 'n8n-nodes-base.nonVersioned',
				usableAsTool: undefined,
			}),
			supplyData: undefined,
		},
	};
	const v1Node = (0, jest_mock_extended_1.mock)({ supplyData: undefined });
	const v2Node = (0, jest_mock_extended_1.mock)({ supplyData: undefined });
	const versionedNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
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
	const toolNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
				name: 'n8n-nodes-base.toolNode',
				displayName: 'TestNode',
				properties: [],
			}),
			supplyData: jest.fn(),
		},
	};
	const toolSupportingNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
				name: 'n8n-nodes-base.testNode',
				displayName: 'TestNode',
				usableAsTool: true,
				properties: [],
			}),
			supplyData: undefined,
		},
	};
	const declarativeNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
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
	const communityNode = {
		sourcePath: '',
		type: {
			description: (0, jest_mock_extended_1.mock)({
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
		throw new n8n_core_1.UnrecognizedNodeTypeError(packageName, nodeType);
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
			const runNodeSpy = jest
				.spyOn(n8n_core_1.RoutingNode.prototype, 'runNode')
				.mockResolvedValue([]);
			result.execute.call((0, jest_mock_extended_1.mock)());
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
			const runNodeSpy = jest
				.spyOn(n8n_core_1.RoutingNode.prototype, 'runNode')
				.mockResolvedValue([]);
			result.execute.call((0, jest_mock_extended_1.mock)());
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
//# sourceMappingURL=node-types.test.js.map

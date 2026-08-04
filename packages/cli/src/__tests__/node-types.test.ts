import type { Logger } from '@n8n/backend-common';
import { RoutingNode, UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	LoadedClass,
	INodeType,
	IVersionedNodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

describe('NodeTypes', () => {
	const logger = mock<Logger>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const nodeTypes: NodeTypes = new NodeTypes(logger, loadNodesAndCredentials);

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
			supplyData: vi.fn(),
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
	// Plain object, not a mock proxy: a proxy hides the prototype/serialization
	// behavior that the synthetic-tool test needs to exercise.
	const plainToolSupportingNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.plainToolNode',
				displayName: 'Plain Tool Node',
				description: 'A plain tool node',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Plain Tool Node' },
				usableAsTool: true,
				properties: [{ displayName: 'Field', name: 'field', type: 'string', default: '' }],
			} as unknown as INodeTypeDescription,
			supplyData: undefined,
		},
	};
	// Versioned node whose v1 cannot be used as a tool while v2 can. Plain-object
	// descriptions (not mock proxies) so `usableAsTool` reads are real.
	const partiallyToolCapableNode: LoadedClass<IVersionedNodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.partiallyToolCapable',
				displayName: 'Partially Tool Capable',
			} as unknown as INodeTypeDescription,
			currentVersion: 2,
			nodeVersions: {
				1: {
					description: {
						name: 'n8n-nodes-base.partiallyToolCapable',
						version: 1,
						properties: [],
					},
				} as unknown as INodeType,
				2: {
					description: {
						name: 'n8n-nodes-base.partiallyToolCapable',
						version: 2,
						usableAsTool: true,
						properties: [],
					},
				} as unknown as INodeType,
			},
			getNodeType(version) {
				return this.nodeVersions[version === 1 ? 1 : 2];
			},
		},
	};
	const multiVersionNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.multiVersion',
				displayName: 'Multi Version Node',
				version: [1, 1.1, 2],
				properties: [],
			} as unknown as INodeTypeDescription,
			supplyData: undefined,
		},
	};
	const hitlSupportingNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.hitlNode',
				displayName: 'Hitl Node',
				version: 1,
				properties: [{ displayName: 'Operation', name: 'operation', type: 'string', default: '' }],
			} as unknown as INodeTypeDescription,
			supplyData: undefined,
		},
	};
	const realToolNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.realTool',
				displayName: 'Real Tool',
				version: 1,
				properties: [],
			} as unknown as INodeTypeDescription,
			supplyData: undefined,
		},
	};
	const replacementToolNode: LoadedClass<INodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.replacementToolNode',
				displayName: 'Replacement Tool Node',
				description: 'Original description',
				version: 1,
				usableAsTool: { replacements: { description: 'Replaced via replacements' } },
				properties: [],
			} as unknown as INodeTypeDescription,
			supplyData: undefined,
		},
	};
	// Versioned node usable as a tool at both versions, where each version exposes
	// a different parameter (mirrors Notion v2 `databaseId` vs v3 `dataSourceId`).
	const versionedToolCapableNode: LoadedClass<IVersionedNodeType> = {
		sourcePath: '',
		type: {
			description: {
				name: 'n8n-nodes-base.versionedToolCapable',
				displayName: 'Versioned Tool Capable',
			} as unknown as INodeTypeDescription,
			currentVersion: 2,
			nodeVersions: {
				1: {
					description: {
						name: 'n8n-nodes-base.versionedToolCapable',
						version: 1,
						usableAsTool: true,
						properties: [
							{ displayName: 'Database ID', name: 'databaseId', type: 'string', default: '' },
						],
					},
					supplyData: undefined,
				} as unknown as INodeType,
				2: {
					description: {
						name: 'n8n-nodes-base.versionedToolCapable',
						version: 2,
						usableAsTool: true,
						properties: [
							{ displayName: 'Data Source ID', name: 'dataSourceId', type: 'string', default: '' },
						],
					},
					supplyData: undefined,
				} as unknown as INodeType,
			},
			getNodeType(version) {
				return this.nodeVersions[version === 1 ? 1 : 2];
			},
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
			if (nodeType === 'plainToolNode') return plainToolSupportingNode;
			if (nodeType === 'partiallyToolCapable') return partiallyToolCapableNode;
			if (nodeType === 'multiVersion') return multiVersionNode;
			if (nodeType === 'hitlNode') return hitlSupportingNode;
			if (nodeType === 'realTool') return realToolNode;
			if (nodeType === 'replacementToolNode') return replacementToolNode;
			if (nodeType === 'versionedToolCapable') return versionedToolCapableNode;
		} else if (fullNodeType === 'n8n-nodes-community.testNode') return communityNode;
		throw new UnrecognizedNodeTypeError(packageName, nodeType);
	});

	loadNodesAndCredentials.recognizesNode.mockImplementation(
		(name) => name === 'n8n-nodes-base.realTool',
	);

	beforeEach(() => {
		vi.clearAllMocks();
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

		it('should return a declarative node-type with an `.execute` method', async () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.declarativeNode');
			expect(result).toBe(declarativeNode.type);
			expect(result.execute).toBeDefined();

			const runNodeSpy = vi.spyOn(RoutingNode.prototype, 'runNode').mockResolvedValue([]);
			await result.execute!.call(mock());
			expect(runNodeSpy).toHaveBeenCalled();
		});

		it('should resolve each version of a synthetic tool independently, not the first-cached one', () => {
			const v1 = nodeTypes.getByNameAndVersion('n8n-nodes-base.versionedToolCapableTool', 1);
			expect(v1.description.version).toBe(1);
			expect(v1.description.properties.some((p) => p.name === 'databaseId')).toBe(true);

			const v2 = nodeTypes.getByNameAndVersion('n8n-nodes-base.versionedToolCapableTool', 2);
			expect(v2.description.version).toBe(2);
			expect(v2.description.properties.some((p) => p.name === 'dataSourceId')).toBe(true);

			// Re-fetch v1: caching v2 must not clobber the v1 entry.
			const v1Again = nodeTypes.getByNameAndVersion('n8n-nodes-base.versionedToolCapableTool', 1);
			expect(v1Again.description.version).toBe(1);

			// No version resolves to the current version and caches independently.
			const vDefault = nodeTypes.getByNameAndVersion('n8n-nodes-base.versionedToolCapableTool');
			expect(vDefault.description.version).toBe(2);
		});

		it('should return a declarative node-type as a tool with an `.execute` method', async () => {
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.declarativeNodeTool');
			expect(result).not.toEqual(declarativeNode.type);
			expect(result.description.name).toEqual('n8n-nodes-base.declarativeNodeTool');
			expect(result.description.displayName).toEqual('Declarative Node Tool');
			expect(result.description.codex?.categories).toContain('AI');
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual(['ai_tool']);
			expect(result.execute).toBeDefined();

			const runNodeSpy = vi.spyOn(RoutingNode.prototype, 'runNode').mockResolvedValue([]);
			await result.execute!.call(mock());
			expect(runNodeSpy).toHaveBeenCalled();
		});
	});

	describe('getSupportedVersions', () => {
		it('should return the single version of a plain node type', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.hitlNode')).toEqual([1]);
		});

		it('should return every version of a plain node type with a version array', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.multiVersion')).toEqual([1, 1.1, 2]);
		});

		it('should return the nodeVersions keys of a versioned node type', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.versioned')).toEqual([1, 2]);
		});

		it('should return undefined for an unknown node type', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.unknownNode')).toBeUndefined();
			expect(nodeTypes.getSupportedVersions('invalid-package.unknownNode')).toBeUndefined();
		});

		it('should resolve a Tool-suffixed name against its base node', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.plainToolNodeTool')).toEqual([1]);
		});

		it('should not count versions that cannot be used as a tool for a Tool-suffixed name', () => {
			// The base node exists at version 1 but is not usableAsTool, so no
			// version can satisfy the synthetic tool wrapper …
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.hitlNodeTool')).toEqual([]);
			// … while HitlTool wrappers have no usability requirement.
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.hitlNodeHitlTool')).toEqual([1]);
		});

		it('should keep only tool-capable versions of a versioned node for a Tool-suffixed name', () => {
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.partiallyToolCapableTool')).toEqual([
				2,
			]);
			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.partiallyToolCapable')).toEqual([1, 2]);
		});

		it('should warn and return undefined when the node fails to load for another reason', () => {
			loadNodesAndCredentials.getNode.mockImplementationOnce(() => {
				throw new TypeError('boom');
			});

			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.hitlNode')).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve node type while listing supported versions',
				{ nodeType: 'n8n-nodes-base.hitlNode', error: 'boom' },
			);
		});

		it('should warn and return undefined when name resolution surfaces a non-node value', () => {
			// A hostile name can make `getNode` return a prototype-chain value
			// instead of throwing; the reads after it must still fail closed.
			loadNodesAndCredentials.getNode.mockReturnValueOnce(Object as never);

			expect(nodeTypes.getSupportedVersions('n8n-nodes-base.poisoned')).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve node type while listing supported versions',
				expect.objectContaining({ nodeType: 'n8n-nodes-base.poisoned' }),
			);
		});

		it('should warn and return undefined when the tool-name check itself throws', () => {
			loadNodesAndCredentials.recognizesNode.mockImplementationOnce(() => {
				throw new TypeError('boom');
			});

			expect(nodeTypes.getSupportedVersions('constructor.anythingTool')).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve node type while listing supported versions',
				{ nodeType: 'constructor.anythingTool', error: 'boom' },
			);
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

		it('should resolve a synthetic tool node type into a complete, serializable description', () => {
			const [result] = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.plainToolNodeTool', version: 1 },
			]);

			expect(result.name).toBe('n8n-nodes-base.plainToolNodeTool');
			expect(result.outputs).toEqual(['ai_tool']);
			// Base fields must survive: the runner can't build the node without them.
			expect(result.version).toBe(1);
			expect(result.group).toEqual(['transform']);
			expect(Array.isArray(result.properties)).toBe(true);
			expect(result.properties.some((p) => p.name === 'field')).toBe(true);
		});

		it('should resolve a synthetic HITL tool node type', () => {
			const [result] = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.hitlNodeHitlTool', version: 1 },
			]);

			expect(result.name).toBe('n8n-nodes-base.hitlNodeHitlTool');
			expect(result.version).toBe(1);
			expect(Array.isArray(result.properties)).toBe(true);
		});

		it('should apply object-form usableAsTool replacements when building a synthetic tool', () => {
			const [result] = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.replacementToolNodeTool', version: 1 },
			]);

			expect(result.name).toBe('n8n-nodes-base.replacementToolNodeTool');
			expect(result.description).toBe('Replaced via replacements');
		});

		it('should not convert a real on-disk node whose type ends in Tool', () => {
			const [result] = nodeTypes.getNodeTypeDescriptions([
				{ name: 'n8n-nodes-base.realTool', version: 1 },
			]);

			expect(result.name).toBe('n8n-nodes-base.realTool');
			expect(result.outputs).toBeUndefined();
		});
	});
});

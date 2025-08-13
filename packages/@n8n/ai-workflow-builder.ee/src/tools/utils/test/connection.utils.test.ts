import type { INode, INodeTypeDescription, IConnections, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	validateConnection,
	nodeHasOutputType,
	nodeAcceptsInputType,
	createConnection,
	removeConnection,
	getNodeConnections,
	formatConnectionMessage,
	inferConnectionType,
} from '../connection.utils';

describe('connection.utils', () => {
	// Mock node types
	const mockMainNodeType: INodeTypeDescription = {
		displayName: 'Main Node',
		name: 'n8n-nodes-base.mainNode',
		group: ['transform'],
		version: 1,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'Main Node' },
		description: '',
	};

	const mockSubNodeType: INodeTypeDescription = {
		displayName: 'AI Sub Node',
		name: 'n8n-nodes-base.aiSubNode',
		group: ['output'],
		version: 1,
		inputs: [],
		outputs: ['ai_embedding', 'ai_tool'],
		properties: [],
		defaults: { name: 'AI Sub Node' },
		description: '',
	};

	const mockDualNodeType: INodeTypeDescription = {
		displayName: 'Dual Node',
		name: 'n8n-nodes-base.dualNode',
		group: ['transform'],
		version: 1,
		inputs: [NodeConnectionTypes.Main, 'ai_embedding'],
		outputs: [NodeConnectionTypes.Main, 'ai_document'],
		properties: [],
		defaults: { name: 'Dual Node' },
		description: '',
	};

	const mockExpressionNodeType: INodeTypeDescription = {
		displayName: 'Expression Node',
		name: 'n8n-nodes-base.expressionNode',
		group: ['transform'],
		version: 1,
		inputs:
			"={{ $parameter.mode === 'retrieve-as-tool' ? ['ai_tool'] : ['main', 'ai_embedding'] }}",
		outputs: "={{ $parameter.outputType === 'array' ? ['main', 'main'] : ['main'] }}",
		properties: [],
		defaults: { name: 'Expression Node' },
		description: '',
	};

	const mockComplexExpressionNodeType: INodeTypeDescription = {
		displayName: 'Complex Expression Node',
		name: 'n8n-nodes-base.complexExpressionNode',
		group: ['transform'],
		version: 1,
		inputs: `={{
			(() => {
				const types = [];
				if ($parameter.acceptMain) {
					types.push({ type: NodeConnectionTypes.Main });
				}
				if ($parameter.acceptAI) {
					types.push({ type: 'ai_embedding' });
				}
				return types;
			})()
		}}`,
		outputs: "={{ [{ type: NodeConnectionTypes.Main }, { type: 'ai_tool' }] }}",
		properties: [],
		defaults: { name: 'Complex Expression Node' },
		description: '',
	};

	const mockTriggerNodeType: INodeTypeDescription = {
		displayName: 'Trigger Node',
		name: 'n8n-nodes-base.trigger',
		group: ['trigger'],
		version: 1,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'Trigger' },
		description: '',
	};

	const mockIfNodeType: INodeTypeDescription = {
		displayName: 'If Node',
		name: 'n8n-nodes-base.if',
		group: ['transform'],
		version: 1,
		inputs: [NodeConnectionTypes.Main],
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [],
		defaults: { name: 'If' },
		description: '',
	};

	const mockVectorStoreNodeType: INodeTypeDescription = {
		displayName: 'Vector Store',
		name: 'n8n-nodes-base.vectorStore',
		group: ['input'],
		version: 1,
		inputs: `={{
			(() => {
				if ($parameter.mode === 'retrieve-as-tool') {
					return [{ type: 'ai_tool' }];
				}
				return [{ type: 'main' }, { type: 'ai_document' }, { type: 'ai_embedding' }];
			})()
		}}`,
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		defaults: { name: 'Vector Store' },
		description: '',
	};

	// Mock nodes
	const mockMainNode: INode = {
		id: 'node1',
		name: 'Main Node',
		type: 'n8n-nodes-base.mainNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const mockSubNode: INode = {
		id: 'node2',
		name: 'AI Sub Node',
		type: 'n8n-nodes-base.aiSubNode',
		typeVersion: 1,
		position: [100, 0],
		parameters: {},
	};

	const mockDualNode: INode = {
		id: 'node3',
		name: 'Dual Node',
		type: 'n8n-nodes-base.dualNode',
		typeVersion: 1,
		position: [200, 0],
		parameters: {},
	};

	const mockNodeTypes = [
		mockMainNodeType,
		mockSubNodeType,
		mockDualNodeType,
		mockExpressionNodeType,
		mockComplexExpressionNodeType,
		mockTriggerNodeType,
		mockIfNodeType,
		mockVectorStoreNodeType,
	];

	describe('validateConnection', () => {
		it('should validate main connection between main nodes', () => {
			const result = validateConnection(
				mockMainNode,
				mockDualNode,
				NodeConnectionTypes.Main,
				mockNodeTypes,
			);
			expect(result).toEqual({ valid: true });
		});

		it('should validate AI connection from sub-node to main node', () => {
			const result = validateConnection(mockSubNode, mockDualNode, 'ai_embedding', mockNodeTypes);
			expect(result).toEqual({ valid: true });
		});

		it('should suggest swapping when AI connection goes from main to sub-node', () => {
			const result = validateConnection(mockDualNode, mockSubNode, 'ai_embedding', mockNodeTypes);
			expect(result).toEqual({
				valid: true,
				shouldSwap: true,
				swappedSource: mockSubNode,
				swappedTarget: mockDualNode,
			});
		});

		it('should reject AI connection between two main nodes', () => {
			const result = validateConnection(mockMainNode, mockDualNode, 'ai_embedding', mockNodeTypes);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('requires a sub-node');
		});

		it('should reject connection when sub-node does not support output type', () => {
			const result = validateConnection(
				mockSubNode,
				mockDualNode,
				'ai_document', // Sub-node doesn't output this
				mockNodeTypes,
			);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('does not support output type');
		});

		it('should handle unknown node types', () => {
			const unknownNode: INode = {
				...mockMainNode,
				type: 'n8n-nodes-base.unknown',
			};
			const result = validateConnection(
				unknownNode,
				mockDualNode,
				NodeConnectionTypes.Main,
				mockNodeTypes,
			);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('node types not found');
		});

		it('should handle expression-based nodes with sub-node detection', () => {
			const expressionNode: INode = {
				id: 'expr1',
				name: 'Expression Node',
				type: 'n8n-nodes-base.expressionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: { mode: 'retrieve-as-tool' },
			};

			// Expression node in tool mode is detected as sub-node (by isSubNode)
			// But it doesn't support the output type 'ai_tool'
			const result = validateConnection(expressionNode, mockMainNode, 'ai_tool', mockNodeTypes);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('does not support output type');
		});
	});

	describe('nodeHasOutputType', () => {
		it('should find output type in array', () => {
			expect(nodeHasOutputType(mockSubNodeType, 'ai_embedding')).toBe(true);
			expect(nodeHasOutputType(mockSubNodeType, 'ai_tool')).toBe(true);
			expect(nodeHasOutputType(mockSubNodeType, 'ai_document')).toBe(false);
		});

		it('should handle string outputs', () => {
			const stringOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: ['main'],
			};
			expect(nodeHasOutputType(stringOutputNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeHasOutputType(stringOutputNode, 'ai_embedding')).toBe(false);
		});

		it('should handle expression outputs containing type', () => {
			const expressionOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: "={{ $parameter.mode === 'tool' ? ['ai_tool'] : ['main'] }}",
			};
			expect(nodeHasOutputType(expressionOutputNode, 'ai_tool')).toBe(true);
			expect(nodeHasOutputType(expressionOutputNode, NodeConnectionTypes.Main)).toBe(true);
		});

		it('should handle object outputs', () => {
			const objectOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: [{ type: NodeConnectionTypes.Main }, { type: 'ai_embedding' }],
			};
			expect(nodeHasOutputType(objectOutputNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeHasOutputType(objectOutputNode, 'ai_embedding')).toBe(true);
		});

		it('should handle nodes without outputs', () => {
			const noOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: [],
			};
			expect(nodeHasOutputType(noOutputNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle empty array outputs', () => {
			const emptyOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: [],
			};
			expect(nodeHasOutputType(emptyOutputNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle mixed array outputs (strings and objects)', () => {
			const mixedOutputNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: [NodeConnectionTypes.Main, { type: 'ai_embedding' }, 'ai_tool'],
			};
			expect(nodeHasOutputType(mixedOutputNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeHasOutputType(mixedOutputNode, 'ai_embedding')).toBe(true);
			expect(nodeHasOutputType(mixedOutputNode, 'ai_tool')).toBe(true);
		});
	});

	describe('nodeAcceptsInputType', () => {
		it('should find input type in array', () => {
			expect(nodeAcceptsInputType(mockDualNodeType, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeAcceptsInputType(mockDualNodeType, 'ai_embedding')).toBe(true);
			expect(nodeAcceptsInputType(mockDualNodeType, 'ai_tool')).toBe(false);
		});

		it('should handle string inputs', () => {
			const stringInputNode: INodeTypeDescription = {
				...mockMainNodeType,
				inputs: ['main'],
			};
			expect(nodeAcceptsInputType(stringInputNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeAcceptsInputType(stringInputNode, 'ai_embedding')).toBe(false);
		});

		it('should handle expression inputs containing type', () => {
			expect(nodeAcceptsInputType(mockExpressionNodeType, 'ai_tool')).toBe(true);
			expect(nodeAcceptsInputType(mockExpressionNodeType, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeAcceptsInputType(mockExpressionNodeType, 'ai_embedding')).toBe(true);
		});

		it('should handle object inputs', () => {
			const objectInputNode: INodeTypeDescription = {
				...mockMainNodeType,
				inputs: [{ type: NodeConnectionTypes.Main }, { type: 'ai_embedding' }],
			};
			expect(nodeAcceptsInputType(objectInputNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeAcceptsInputType(objectInputNode, 'ai_embedding')).toBe(true);
		});

		it('should handle nodes without inputs', () => {
			const noInputNode: INodeTypeDescription = {
				...mockMainNodeType,
				inputs: [],
			};
			expect(nodeAcceptsInputType(noInputNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle empty array inputs', () => {
			const emptyInputNode: INodeTypeDescription = {
				...mockMainNodeType,
				inputs: [],
			};
			expect(nodeAcceptsInputType(emptyInputNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle complex expressions with NodeConnectionTypes', () => {
			// The complex expression has type: 'ai_embedding' in the string
			// so it should find that type
			expect(nodeAcceptsInputType(mockComplexExpressionNodeType, NodeConnectionTypes.Main)).toBe(
				false,
			);
			expect(nodeAcceptsInputType(mockComplexExpressionNodeType, 'ai_embedding')).toBe(true);
		});
	});

	describe('createConnection', () => {
		it('should create a new connection', () => {
			const connections: IConnections = {};
			const result = createConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result).toEqual({
				node1: {
					main: [[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			});
		});

		it('should add to existing connections', () => {
			const connections: IConnections = {
				node1: {
					main: [[{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = createConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result.node1.main[0]).toHaveLength(2);
			expect(result.node1.main[0]).toContainEqual({
				node: 'node2',
				type: NodeConnectionTypes.Main,
				index: 0,
			});
		});

		it('should handle custom indices', () => {
			const connections: IConnections = {};
			const result = createConnection(
				connections,
				'node1',
				'node2',
				NodeConnectionTypes.Main,
				1, // sourceOutputIndex
				2, // targetInputIndex
			);

			expect(result.node1.main).toHaveLength(2);
			expect(result.node1.main[0]).toEqual([]);
			expect(result.node1.main[1]).toEqual([
				{
					node: 'node2',
					type: NodeConnectionTypes.Main,
					index: 2,
				},
			]);
		});

		it('should not duplicate existing connections', () => {
			const connections: IConnections = {
				node1: {
					main: [[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = createConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result.node1.main[0]).toHaveLength(1);
		});

		it('should handle different connection types', () => {
			const connections: IConnections = {};
			const result1 = createConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);
			const result2 = createConnection(
				result1,
				'node1',
				'node3',
				'ai_embedding' as NodeConnectionType,
			);

			expect(result2.node1).toHaveProperty('main');
			expect(result2.node1).toHaveProperty('ai_embedding');
			expect(result2.node1.main[0]).toHaveLength(1);
			expect(result2.node1.ai_embedding[0]).toHaveLength(1);
		});

		it('should handle null/undefined in connection arrays', () => {
			const connections: IConnections = {
				node1: {
					main: [null, []],
				},
			};
			const result = createConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main, 0);

			expect(result.node1.main[0]).toEqual([
				{
					node: 'node2',
					type: NodeConnectionTypes.Main,
					index: 0,
				},
			]);
		});
	});

	describe('removeConnection', () => {
		it('should remove a specific connection', () => {
			const connections: IConnections = {
				node1: {
					main: [
						[
							{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};
			const result = removeConnection(
				connections,
				'node1',
				'node2',
				NodeConnectionTypes.Main,
				0,
				0,
			);

			expect(result.node1.main[0]).toHaveLength(1);
			expect(result.node1.main[0]?.[0].node).toBe('node3');
		});

		it('should remove all connections to a target node', () => {
			const connections: IConnections = {
				node1: {
					main: [
						[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'node2', type: NodeConnectionTypes.Main, index: 1 }],
					],
				},
			};
			const result = removeConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result.node1).toBeUndefined();
		});

		it('should clean up empty connection types', () => {
			const connections: IConnections = {
				node1: {
					main: [[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = removeConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result.node1).toBeUndefined();
		});

		it('should handle non-existent connections gracefully', () => {
			const connections: IConnections = {
				node1: {
					main: [[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = removeConnection(
				connections,
				'node1',
				'node3', // non-existent
				NodeConnectionTypes.Main,
			);

			expect(result).toEqual(connections);
		});

		it('should handle non-existent source node', () => {
			const connections: IConnections = {};
			const result = removeConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result).toEqual({});
		});

		it('should handle different connection types', () => {
			const connections: IConnections = {
				node1: {
					main: [[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
					ai_embedding: [[{ node: 'node3', type: 'ai_embedding' as NodeConnectionType, index: 0 }]],
				},
			};
			const result = removeConnection(connections, 'node1', 'node3', 'ai_embedding');

			expect(result.node1).toHaveProperty('main');
			expect(result.node1).not.toHaveProperty('ai_embedding');
		});

		it('should handle null/undefined in connection arrays', () => {
			const connections: IConnections = {
				node1: {
					main: [null, [{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = removeConnection(connections, 'node1', 'node2', NodeConnectionTypes.Main);

			expect(result.node1).toBeUndefined();
		});
	});

	describe('getNodeConnections', () => {
		const complexConnections: IConnections = {
			node1: {
				main: [
					[{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'node3', type: NodeConnectionTypes.Main, index: 0 }],
				],
				ai_embedding: [[{ node: 'node4', type: 'ai_embedding' as NodeConnectionType, index: 1 }]],
			},
			node2: {
				main: [[{ node: 'node3', type: NodeConnectionTypes.Main, index: 1 }]],
			},
		};

		it('should get outgoing connections', () => {
			const result = getNodeConnections(complexConnections, 'node1', 'source');

			expect(result).toHaveLength(3);
			expect(result).toContainEqual({
				node: 'node2',
				type: NodeConnectionTypes.Main,
				sourceIndex: 0,
				targetIndex: 0,
			});
			expect(result).toContainEqual({
				node: 'node3',
				type: NodeConnectionTypes.Main,
				sourceIndex: 1,
				targetIndex: 0,
			});
			expect(result).toContainEqual({
				node: 'node4',
				type: 'ai_embedding',
				sourceIndex: 0,
				targetIndex: 1,
			});
		});

		it('should get incoming connections', () => {
			const result = getNodeConnections(complexConnections, 'node3', 'target');

			expect(result).toHaveLength(2);
			expect(result).toContainEqual({
				node: 'node1',
				type: NodeConnectionTypes.Main,
				sourceIndex: 1,
				targetIndex: 0,
			});
			expect(result).toContainEqual({
				node: 'node2',
				type: NodeConnectionTypes.Main,
				sourceIndex: 0,
				targetIndex: 1,
			});
		});

		it('should return empty array for nodes without connections', () => {
			const result = getNodeConnections(complexConnections, 'node5', 'source');
			expect(result).toEqual([]);
		});

		it('should handle null/undefined in connection arrays', () => {
			const connections: IConnections = {
				node1: {
					main: [null, [{ node: 'node2', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};
			const result = getNodeConnections(connections, 'node1', 'source');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				node: 'node2',
				type: NodeConnectionTypes.Main,
				sourceIndex: 1,
				targetIndex: 0,
			});
		});
	});

	describe('formatConnectionMessage', () => {
		it('should format normal connection', () => {
			const result = formatConnectionMessage('Node A', 'Node B', NodeConnectionTypes.Main);
			expect(result).toBe('Connected: Node A → Node B (main)');
		});

		it('should format swapped connection', () => {
			const result = formatConnectionMessage('Node A', 'Node B', 'ai_embedding', true);
			expect(result).toBe(
				'Auto-corrected connection: Node A (ai_embedding) → Node B. (Note: Swapped nodes to ensure sub-node is the source)',
			);
		});

		it('should handle different connection types', () => {
			const result = formatConnectionMessage('AI Node', 'Main Node', 'ai_tool');
			expect(result).toBe('Connected: AI Node → Main Node (ai_tool)');
		});
	});

	describe('inferConnectionType', () => {
		it('should infer main connection between main nodes', () => {
			const result = inferConnectionType(
				mockMainNode,
				mockDualNode,
				mockMainNodeType,
				mockDualNodeType,
			);
			expect(result).toEqual({ connectionType: NodeConnectionTypes.Main });
		});

		it('should infer AI connection from sub-node to main node', () => {
			const result = inferConnectionType(
				mockSubNode,
				mockDualNode,
				mockSubNodeType,
				mockDualNodeType,
			);
			expect(result).toEqual({ connectionType: 'ai_embedding' });
		});

		it('should suggest swap for main node to sub-node', () => {
			// For swap to work, the target (sub-node) must output something the source accepts
			const aiOutputSubNode: INodeTypeDescription = {
				...mockSubNodeType,
				name: 'n8n-nodes-base.aiOutputSub',
				inputs: [],
				outputs: ['ai_embedding'],
			};
			const targetNode: INode = {
				id: 'sub1',
				name: 'AI Output Sub',
				type: aiOutputSubNode.name,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			// Use dualNode as source since it accepts ai_embedding
			const result = inferConnectionType(
				mockDualNode,
				targetNode,
				mockDualNodeType,
				aiOutputSubNode,
			);
			expect(result.requiresSwap).toBe(true);
			expect(result.connectionType).toBe('ai_embedding');
		});

		it('should handle multiple possible AI connections', () => {
			const multiOutputSubNode: INodeTypeDescription = {
				...mockSubNodeType,
				outputs: ['ai_embedding', 'ai_tool'],
			};
			const multiInputMainNode: INodeTypeDescription = {
				...mockDualNodeType,
				inputs: [NodeConnectionTypes.Main, 'ai_embedding', 'ai_tool'],
			};

			const result = inferConnectionType(
				mockSubNode,
				mockDualNode,
				multiOutputSubNode,
				multiInputMainNode,
			);

			expect(result.possibleTypes).toEqual(['ai_embedding', 'ai_tool']);
			expect(result.error).toContain('Multiple AI connection types possible');
		});

		it('should handle no compatible connections', () => {
			const incompatibleNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: ['ai_document'],
				inputs: ['ai_tool'],
			};

			const result = inferConnectionType(
				mockMainNode,
				mockDualNode,
				mockMainNodeType,
				incompatibleNode,
			);

			expect(result.error).toContain('No compatible connection types found');
		});

		it('should handle expression-based nodes', () => {
			const exprNode: INode = {
				...mockMainNode,
				type: 'n8n-nodes-base.expressionNode',
				parameters: { mode: 'retrieve-as-tool' },
			};

			const result = inferConnectionType(
				exprNode,
				mockDualNode,
				mockExpressionNodeType,
				mockDualNodeType,
			);

			// Expression node in tool mode acts as sub-node
			expect(result.connectionType).toBeDefined();
		});

		it('should handle If node with multiple outputs', () => {
			const ifNode: INode = {
				id: 'if1',
				name: 'If',
				type: 'n8n-nodes-base.if',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const result = inferConnectionType(ifNode, mockMainNode, mockIfNodeType, mockMainNodeType);

			expect(result).toEqual({ connectionType: NodeConnectionTypes.Main });
		});

		it('should handle trigger nodes with no inputs', () => {
			const triggerNode: INode = {
				id: 'trigger1',
				name: 'Trigger',
				type: 'n8n-nodes-base.trigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const result = inferConnectionType(
				triggerNode,
				mockMainNode,
				mockTriggerNodeType,
				mockMainNodeType,
			);

			expect(result).toEqual({ connectionType: NodeConnectionTypes.Main });
		});

		it('should handle sub-node to sub-node connections', () => {
			const aiDocSubNode: INodeTypeDescription = {
				...mockSubNodeType,
				outputs: ['ai_document'],
			};
			const aiDocAcceptorSubNode: INodeTypeDescription = {
				...mockSubNodeType,
				name: 'n8n-nodes-base.aiDocAcceptor',
				inputs: ['ai_document'],
				outputs: ['ai_tool'],
			};
			const sourceNode: INode = {
				...mockSubNode,
				type: aiDocSubNode.name,
			};
			const targetNode: INode = {
				...mockSubNode,
				id: 'node3',
				name: 'AI Doc Acceptor',
				type: aiDocAcceptorSubNode.name,
			};

			const result = inferConnectionType(
				sourceNode,
				targetNode,
				aiDocSubNode,
				aiDocAcceptorSubNode,
			);

			expect(result).toEqual({ connectionType: 'ai_document' });
		});

		it('should handle vector store with mode-based inputs', () => {
			const vectorStoreNode: INode = {
				id: 'vs1',
				name: 'Vector Store',
				type: 'n8n-nodes-base.vectorStore',
				typeVersion: 1,
				position: [0, 0],
				parameters: { mode: 'retrieve-as-tool' },
			};

			const aiToolOutputNode: INodeTypeDescription = {
				...mockSubNodeType,
				outputs: ['ai_tool'],
			};
			const aiToolNode: INode = {
				...mockSubNode,
				type: aiToolOutputNode.name,
			};

			const result = inferConnectionType(
				aiToolNode,
				vectorStoreNode,
				aiToolOutputNode,
				mockVectorStoreNodeType,
			);

			// Vector Store in tool mode only accepts ai_tool, and source outputs it
			// This should work as an AI connection
			expect(result.connectionType).toBe('ai_tool');
		});

		it('should handle complex expression with array return', () => {
			const complexNode: INode = {
				id: 'complex1',
				name: 'Complex',
				type: 'n8n-nodes-base.complexExpressionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: { acceptMain: true, acceptAI: true },
			};

			const result = inferConnectionType(
				complexNode,
				mockMainNode,
				mockComplexExpressionNodeType,
				mockMainNodeType,
			);

			expect(result).toEqual({ connectionType: NodeConnectionTypes.Main });
		});

		it('should handle expression returning array with main', () => {
			const arrayExprNode: INodeTypeDescription = {
				...mockMainNodeType,
				name: 'n8n-nodes-base.arrayExpr',
				outputs: '={{ ["main", "main"] }}',
			};
			const arrayNode: INode = {
				id: 'array1',
				name: 'Array',
				type: arrayExprNode.name,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const result = inferConnectionType(arrayNode, mockMainNode, arrayExprNode, mockMainNodeType);

			expect(result).toEqual({ connectionType: NodeConnectionTypes.Main });
		});

		it('should handle single matching type fallback', () => {
			const customNode: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing custom types
				outputs: ['custom_type'],
			};
			const customAcceptorNode: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing custom types
				inputs: ['custom_type'],
			};
			const sourceNode: INode = {
				...mockMainNode,
				type: customNode.name,
			};
			const targetNode: INode = {
				...mockMainNode,
				id: 'custom2',
				type: customAcceptorNode.name,
			};

			const result = inferConnectionType(sourceNode, targetNode, customNode, customAcceptorNode);

			expect(result).toEqual({ connectionType: 'custom_type' });
		});

		it('should handle multiple non-AI matching types', () => {
			const multiNode1: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing custom types
				outputs: ['type1', 'type2'],
			};
			const multiNode2: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing custom types
				inputs: ['type1', 'type2'],
			};
			const sourceNode: INode = {
				...mockMainNode,
				type: multiNode1.name,
			};
			const targetNode: INode = {
				...mockMainNode,
				id: 'multi2',
				type: multiNode2.name,
			};

			const result = inferConnectionType(sourceNode, targetNode, multiNode1, multiNode2);

			expect(result.possibleTypes).toEqual(['type1', 'type2']);
			expect(result.error).toContain('Multiple connection types possible');
		});
	});

	describe('expression parsing edge cases', () => {
		it('should handle malformed expressions gracefully', () => {
			const malformedNode: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing ivalid type
				inputs: '={{ this is not valid javascript',
			};
			expect(nodeAcceptsInputType(malformedNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle empty expressions', () => {
			const emptyExprNode: INodeTypeDescription = {
				...mockMainNodeType,
				// @ts-expect-error Testing ivalid type
				inputs: '',
			};
			expect(nodeAcceptsInputType(emptyExprNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle expressions with no types', () => {
			const noTypeExprNode: INodeTypeDescription = {
				...mockMainNodeType,
				inputs: '={{ $parameter.something }}',
			};
			expect(nodeAcceptsInputType(noTypeExprNode, NodeConnectionTypes.Main)).toBe(false);
		});

		it('should handle expressions with return statements', () => {
			const returnExprNode: INodeTypeDescription = {
				...mockMainNodeType,
				outputs: "={{ return ['main', 'ai_tool'] }}",
			};
			expect(nodeHasOutputType(returnExprNode, NodeConnectionTypes.Main)).toBe(true);
			expect(nodeHasOutputType(returnExprNode, 'ai_tool')).toBe(true);
		});
	});
});

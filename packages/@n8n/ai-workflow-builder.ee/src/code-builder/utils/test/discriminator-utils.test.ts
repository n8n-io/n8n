import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import {
	extractModeDiscriminator,
	extractOperationOnlyDiscriminator,
	type ModeInfo,
} from '../discriminator-utils';

// Mock vector store node with mode discriminator that includes outputConnectionType
const mockVectorStoreNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
	displayName: 'Pinecone Vector Store',
	description: 'Work with your data in Pinecone Vector Store',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Pinecone Vector Store' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Operation Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Get Many',
					value: 'load',
					description: 'Get many ranked documents from vector store for query',
				},
				{
					name: 'Insert Documents',
					value: 'insert',
					description: 'Insert documents into vector store',
				},
				{
					name: 'Retrieve Documents (As Vector Store for Chain/Tool)',
					value: 'retrieve',
					description:
						'Retrieve documents from vector store to be used as vector store with AI nodes',
					outputConnectionType: NodeConnectionTypes.AiVectorStore,
				},
				{
					name: 'Retrieve Documents (As Tool for AI Agent)',
					value: 'retrieve-as-tool',
					description: 'Retrieve documents from vector store to be used as tool with AI nodes',
					outputConnectionType: NodeConnectionTypes.AiTool,
				},
				{
					name: 'Update Documents',
					value: 'update',
					description: 'Update documents in vector store by ID',
				},
			],
			default: 'load',
		},
	],
};

// Simple Code node without outputConnectionType
const mockCodeNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.code',
	displayName: 'Code',
	description: 'Run custom JavaScript code',
	group: ['transform'],
	version: 2,
	defaults: { name: 'Code' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
				{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' },
			],
			default: 'runOnceForAllItems',
		},
	],
};

describe('extractModeDiscriminator', () => {
	describe('basic mode extraction', () => {
		it('should extract mode values from a node with mode property', () => {
			const result = extractModeDiscriminator(mockCodeNode, 2);

			expect(result).not.toBeNull();
			expect(result!.modes).toHaveLength(2);
			expect(result!.modes.map((m: ModeInfo) => m.value)).toContain('runOnceForAllItems');
			expect(result!.modes.map((m: ModeInfo) => m.value)).toContain('runOnceForEachItem');
		});

		it('should return null for nodes without mode property', () => {
			const nodeWithoutMode: INodeTypeDescription = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests',
				group: ['transform'],
				version: 4,
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			};

			const result = extractModeDiscriminator(nodeWithoutMode, 4);
			expect(result).toBeNull();
		});
	});

	describe('extended mode info with displayName and outputConnectionType', () => {
		it('should include displayName for each mode', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();
			expect(result!.modes).toHaveLength(5);

			const loadMode = result!.modes.find((m: ModeInfo) => m.value === 'load');
			expect(loadMode).toBeDefined();
			expect(loadMode!.displayName).toBe('Get Many');

			const retrieveMode = result!.modes.find((m: ModeInfo) => m.value === 'retrieve');
			expect(retrieveMode).toBeDefined();
			expect(retrieveMode!.displayName).toBe('Retrieve Documents (As Vector Store for Chain/Tool)');

			const retrieveAsToolMode = result!.modes.find(
				(m: ModeInfo) => m.value === 'retrieve-as-tool',
			);
			expect(retrieveAsToolMode).toBeDefined();
			expect(retrieveAsToolMode!.displayName).toBe('Retrieve Documents (As Tool for AI Agent)');
		});

		it('should include outputConnectionType when present', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			// retrieve mode should have AiVectorStore connection type
			const retrieveMode = result!.modes.find((m: ModeInfo) => m.value === 'retrieve');
			expect(retrieveMode).toBeDefined();
			expect(retrieveMode!.outputConnectionType).toBe(NodeConnectionTypes.AiVectorStore);

			// retrieve-as-tool mode should have AiTool connection type
			const retrieveAsToolMode = result!.modes.find(
				(m: ModeInfo) => m.value === 'retrieve-as-tool',
			);
			expect(retrieveAsToolMode).toBeDefined();
			expect(retrieveAsToolMode!.outputConnectionType).toBe(NodeConnectionTypes.AiTool);
		});

		it('should have undefined outputConnectionType for modes without it', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			// load, insert, update modes should NOT have outputConnectionType
			const loadMode = result!.modes.find((m: ModeInfo) => m.value === 'load');
			expect(loadMode).toBeDefined();
			expect(loadMode!.outputConnectionType).toBeUndefined();

			const insertMode = result!.modes.find((m: ModeInfo) => m.value === 'insert');
			expect(insertMode).toBeDefined();
			expect(insertMode!.outputConnectionType).toBeUndefined();

			const updateMode = result!.modes.find((m: ModeInfo) => m.value === 'update');
			expect(updateMode).toBeDefined();
			expect(updateMode!.outputConnectionType).toBeUndefined();
		});

		it('should work with Code node that has no outputConnectionType on any mode', () => {
			const result = extractModeDiscriminator(mockCodeNode, 2);

			expect(result).not.toBeNull();
			expect(result!.modes).toHaveLength(2);

			// All modes should have displayName but no outputConnectionType
			for (const mode of result!.modes) {
				expect(mode.displayName).toBeDefined();
				expect(mode.outputConnectionType).toBeUndefined();
			}

			const runOnceForAll = result!.modes.find((m: ModeInfo) => m.value === 'runOnceForAllItems');
			expect(runOnceForAll!.displayName).toBe('Run Once for All Items');
		});
	});

	describe('description and builderHint extraction', () => {
		it('should include description when present on mode options', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			const loadMode = result!.modes.find((m: ModeInfo) => m.value === 'load');
			expect(loadMode!.description).toBe('Get many ranked documents from vector store for query');

			const insertMode = result!.modes.find((m: ModeInfo) => m.value === 'insert');
			expect(insertMode!.description).toBe('Insert documents into vector store');
		});

		it('should include builderHint when present on mode options', () => {
			const nodeWithBuilderHints: INodeTypeDescription = {
				name: 'n8n-nodes-base.testNodeWithHints',
				displayName: 'Test Node',
				description: 'A test node with builderHints',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						noDataExpression: true,
						options: [
							{
								name: 'Mode A',
								value: 'modeA',
								description: 'Description of mode A',
								builderHint: { message: 'Use mode A when you want to do X' },
							},
							{
								name: 'Mode B',
								value: 'modeB',
								description: 'Description of mode B',
								// No builderHint - should be undefined
							},
						],
						default: 'modeA',
					},
				],
			};

			const result = extractModeDiscriminator(nodeWithBuilderHints, 1);

			expect(result).not.toBeNull();

			const modeA = result!.modes.find((m: ModeInfo) => m.value === 'modeA');
			expect(modeA!.description).toBe('Description of mode A');
			expect(modeA!.builderHint).toEqual({ message: 'Use mode A when you want to do X' });

			const modeB = result!.modes.find((m: ModeInfo) => m.value === 'modeB');
			expect(modeB!.description).toBe('Description of mode B');
			expect(modeB!.builderHint).toBeUndefined();
		});
	});
});

// Mock operation-only node (like Remove Duplicates V2)
const mockOperationOnlyNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.removeDuplicates',
	displayName: 'Remove Duplicates',
	description: 'Delete items with matching field values',
	group: ['transform'],
	version: 2,
	defaults: { name: 'Remove Duplicates' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Remove Items Repeated Within Current Input',
					value: 'removeDuplicateInputItems',
					description: 'Remove duplicates from incoming items',
				},
				{
					name: 'Remove Items Processed in Previous Executions',
					value: 'removeItemsSeenInPreviousExecutions',
					description: 'Deduplicate items already seen in previous executions',
				},
				{
					name: 'Clear Deduplication History',
					value: 'clearDeduplicationHistory',
					description: 'Wipe the store of previous items',
				},
			],
			default: 'removeDuplicateInputItems',
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			default: 'cleanDatabase',
			displayOptions: {
				show: {
					operation: ['clearDeduplicationHistory'],
				},
			},
			options: [
				{
					name: 'Clean Database',
					value: 'cleanDatabase',
					description: 'Clear all values stored for a key in the database',
				},
			],
		},
	],
};

// Mock node with both resource and operation
const mockResourceAndOperationNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.googleSheets',
	displayName: 'Google Sheets',
	description: 'Read, update and write data to Google Sheets',
	group: ['transform'],
	version: 4,
	defaults: { name: 'Google Sheets' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [{ name: 'Sheet', value: 'sheet' }],
			default: 'sheet',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{ name: 'Append Row', value: 'append' },
				{ name: 'Read Rows', value: 'read' },
			],
			default: 'append',
			displayOptions: { show: { resource: ['sheet'] } },
		},
	],
};

describe('extractOperationOnlyDiscriminator', () => {
	it('should extract operations from a node with operation but no resource', () => {
		const result = extractOperationOnlyDiscriminator(mockOperationOnlyNode, 2);

		expect(result).not.toBeNull();
		expect(result!.operations).toHaveLength(3);
		expect(result!.operations.map((op) => op.value)).toEqual([
			'removeDuplicateInputItems',
			'removeItemsSeenInPreviousExecutions',
			'clearDeduplicationHistory',
		]);
	});

	it('should include displayName and description for each operation', () => {
		const result = extractOperationOnlyDiscriminator(mockOperationOnlyNode, 2);

		expect(result).not.toBeNull();

		const firstOp = result!.operations.find((op) => op.value === 'removeDuplicateInputItems');
		expect(firstOp!.displayName).toBe('Remove Items Repeated Within Current Input');
		expect(firstOp!.description).toBe('Remove duplicates from incoming items');
	});

	it('should return null for nodes with both resource and operation', () => {
		const result = extractOperationOnlyDiscriminator(mockResourceAndOperationNode, 4);

		expect(result).toBeNull();
	});

	it('should return null for nodes without operation property', () => {
		const result = extractOperationOnlyDiscriminator(mockCodeNode, 2);

		expect(result).toBeNull();
	});

	it('should return null for nodes with no properties', () => {
		const emptyNode: INodeTypeDescription = {
			name: 'n8n-nodes-base.empty',
			displayName: 'Empty',
			description: 'Empty node',
			group: ['transform'],
			version: 1,
			defaults: { name: 'Empty' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
		};

		const result = extractOperationOnlyDiscriminator(emptyNode, 1);

		expect(result).toBeNull();
	});
});

describe('extractModeDiscriminator - subordinate mode guard', () => {
	it('should return null for mode properties subordinate to operation', () => {
		const result = extractModeDiscriminator(mockOperationOnlyNode, 2);

		expect(result).toBeNull();
	});

	it('should still extract top-level mode properties without displayOptions dependencies', () => {
		const result = extractModeDiscriminator(mockCodeNode, 2);

		expect(result).not.toBeNull();
		expect(result!.modes).toHaveLength(2);
	});
});

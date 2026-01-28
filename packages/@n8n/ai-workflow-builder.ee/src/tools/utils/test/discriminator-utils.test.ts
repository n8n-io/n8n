import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { extractModeDiscriminator } from '../discriminator-utils';

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
			expect(result!.modes.map((m) => m.value)).toContain('runOnceForAllItems');
			expect(result!.modes.map((m) => m.value)).toContain('runOnceForEachItem');
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

			const loadMode = result!.modes.find((m) => m.value === 'load');
			expect(loadMode).toBeDefined();
			expect(loadMode!.displayName).toBe('Get Many');

			const retrieveMode = result!.modes.find((m) => m.value === 'retrieve');
			expect(retrieveMode).toBeDefined();
			expect(retrieveMode!.displayName).toBe('Retrieve Documents (As Vector Store for Chain/Tool)');

			const retrieveAsToolMode = result!.modes.find((m) => m.value === 'retrieve-as-tool');
			expect(retrieveAsToolMode).toBeDefined();
			expect(retrieveAsToolMode!.displayName).toBe('Retrieve Documents (As Tool for AI Agent)');
		});

		it('should include outputConnectionType when present', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			// retrieve mode should have AiVectorStore connection type
			const retrieveMode = result!.modes.find((m) => m.value === 'retrieve');
			expect(retrieveMode).toBeDefined();
			expect(retrieveMode!.outputConnectionType).toBe(NodeConnectionTypes.AiVectorStore);

			// retrieve-as-tool mode should have AiTool connection type
			const retrieveAsToolMode = result!.modes.find((m) => m.value === 'retrieve-as-tool');
			expect(retrieveAsToolMode).toBeDefined();
			expect(retrieveAsToolMode!.outputConnectionType).toBe(NodeConnectionTypes.AiTool);
		});

		it('should have undefined outputConnectionType for modes without it', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			// load, insert, update modes should NOT have outputConnectionType
			const loadMode = result!.modes.find((m) => m.value === 'load');
			expect(loadMode).toBeDefined();
			expect(loadMode!.outputConnectionType).toBeUndefined();

			const insertMode = result!.modes.find((m) => m.value === 'insert');
			expect(insertMode).toBeDefined();
			expect(insertMode!.outputConnectionType).toBeUndefined();

			const updateMode = result!.modes.find((m) => m.value === 'update');
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

			const runOnceForAll = result!.modes.find((m) => m.value === 'runOnceForAllItems');
			expect(runOnceForAll!.displayName).toBe('Run Once for All Items');
		});
	});

	describe('description and builderHint extraction', () => {
		it('should include description when present on mode options', () => {
			const result = extractModeDiscriminator(mockVectorStoreNode, 1);

			expect(result).not.toBeNull();

			const loadMode = result!.modes.find((m) => m.value === 'load');
			expect(loadMode!.description).toBe('Get many ranked documents from vector store for query');

			const insertMode = result!.modes.find((m) => m.value === 'insert');
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
								builderHint: 'Use mode A when you want to do X',
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

			const modeA = result!.modes.find((m) => m.value === 'modeA');
			expect(modeA!.description).toBe('Description of mode A');
			expect(modeA!.builderHint).toBe('Use mode A when you want to do X');

			const modeB = result!.modes.find((m) => m.value === 'modeB');
			expect(modeB!.description).toBe('Description of mode B');
			expect(modeB!.builderHint).toBeUndefined();
		});
	});
});

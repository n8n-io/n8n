import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import type { Embeddings } from '@langchain/core/embeddings';
import { createVectorStoreNode, isToolsInstance } from '@n8n/ai-utilities';
import { SupplyDataContext } from 'n8n-core';
import type { INode, INodeTypes, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { createRunExecutionData, jsonParse, NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

const restoreUserFolder = vi.hoisted(() => {
	const { mkdtempSync, rmSync } = process.getBuiltinModule('fs');
	const { tmpdir } = process.getBuiltinModule('os');
	const { join } = process.getBuiltinModule('path');
	const originalUserFolder = process.env.N8N_USER_FOLDER;
	const testUserFolder = mkdtempSync(join(tmpdir(), 'n8n-vector-store-tool-test-'));
	process.env.N8N_USER_FOLDER = testUserFolder;
	return () => {
		if (originalUserFolder === undefined) delete process.env.N8N_USER_FOLDER;
		else process.env.N8N_USER_FOLDER = originalUserFolder;
		rmSync(testUserFolder, { recursive: true, force: true });
	};
});

afterAll(restoreUserFolder);

describe('Vector store tool', () => {
	it.each([
		{ key: 'count', blank: '' },
		{ key: 'count', blank: '   ' },
		{ key: 'query', blank: '' },
		{ key: 'query', blank: '   ' },
	])(
		'uses the limit for each call with key "$key" and blank default (%j)',
		async ({ key, blank }) => {
			const embeddings = mock<Embeddings>();
			embeddings.embedQuery.mockResolvedValue([1, 0]);
			const store = new MemoryVectorStore(embeddings);
			await store.addVectors(
				Array.from({ length: 5 }, () => [1, 0]),
				Array.from({ length: 5 }, () => ({ pageContent: 'Document', metadata: {} })),
			);
			const VectorStoreNode = createVectorStoreNode({
				meta: {
					name: 'testVectorStore',
					displayName: 'Test Vector Store',
					description: 'Test vector store',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
				},
				sharedFields: [],
				getVectorStoreClient: async () => store,
				populateVectorStore: vi.fn(),
			});
			const nodeType = new VectorStoreNode();
			const node: INode = {
				id: 'store',
				name: 'Vector Store',
				type: nodeType.description.name,
				typeVersion: 1.3,
				position: [0, 0],
				parameters: {
					mode: 'retrieve-as-tool',
					toolDescription: 'Search documents',
					topK: `={{ $fromAI('${key}', 'Result count', 'number', '${blank}') }}`,
				},
			};
			const nodeTypes = mock<INodeTypes>();
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			const workflow = new Workflow({ nodes: [node], connections: {}, active: false, nodeTypes });
			const runExecutionData = createRunExecutionData();
			const context = new SupplyDataContext(
				workflow,
				node,
				mock<IWorkflowExecuteAdditionalData>({
					currentNodeExecutionIndex: 0,
					webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
					formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				}),
				'manual',
				runExecutionData,
				0,
				[],
				{},
				NodeConnectionTypes.AiTool,
				{ node, data: {}, source: null },
				[],
			);
			vi.spyOn(context, 'getInputConnectionData').mockResolvedValue(embeddings);
			const { response: tool } = await nodeType.supplyData.call(context, 0);
			if (!isToolsInstance(tool)) throw new Error('Expected a tool');

			const queries = [
				{ input: 'Search' },
				{ input: 'Search', [key]: 0 },
				{ input: 'Search', [key]: 5 },
				{ input: 'Search' },
			];
			const resultCounts: number[] = [];
			for (const query of queries) {
				const result: unknown = await tool.invoke(query);
				if (typeof result !== 'string') throw new Error('Expected serialized tool results');
				resultCounts.push(jsonParse<unknown[]>(result).length);
			}

			expect(resultCounts).toEqual([4, 0, 5, 4]);
			expect(
				runExecutionData.resultData.runData[node.name].map(
					({ inputOverride, executionStatus }) => ({
						query: inputOverride?.[NodeConnectionTypes.AiTool]?.[0]?.[0]?.json.query,
						executionStatus,
					}),
				),
			).toEqual(queries.map((query) => ({ query, executionStatus: 'success' })));
		},
	);
});

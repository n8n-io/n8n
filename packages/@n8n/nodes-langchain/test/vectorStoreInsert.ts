import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { IDataObject, IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

export function createInsertContext(
	typeVersion: number,
	parameters: IDataObject,
	embeddings: Embeddings,
	documents: Document[],
	credentials: IDataObject = {},
): IExecuteFunctions {
	const context = createMockExecuteFunction(
		{ mode: 'insert', embeddingBatchSize: 1, ...parameters },
		{
			id: 'vector-store',
			name: 'Vector Store',
			typeVersion,
			type: 'vectorStore',
			position: [0, 0],
			parameters: {},
		},
	);
	return Object.assign(context, {
		getCredentials: vi.fn().mockResolvedValue(credentials),
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getInputConnectionData: vi.fn(async (type: NodeConnectionType) =>
			type === NodeConnectionTypes.AiEmbedding ? embeddings : documents,
		),
		getExecutionCancelSignal: vi.fn().mockReturnValue(undefined),
		logger: mock<IExecuteFunctions['logger']>(),
		logAiEvent: vi.fn(),
	});
}

import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { MemoryVectorStoreManager } from '../../shared/MemoryVectorStoreManager';

export async function loadExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const workflowId = this.getWorkflow().id;
	const memoryKey = this.getNodeParameter('memoryKey', 0) as string;

	const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings);
	const vectorStoreInstance = await vectorStoreSingleton.getVectorStore(
		`${workflowId}__${memoryKey}`,
	);

	const resultData = [];
	const items = this.getInputData(0);
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const query = this.getNodeParameter('query', itemIndex) as string;
		const topK = this.getNodeParameter('topK', itemIndex, 4) as number;

		const embeddedQuery = await embeddings.embedQuery(query);
		const docs = await vectorStoreInstance.similaritySearchVectorWithScore(embeddedQuery, topK);

		const serializedDocs = docs.map(([doc, score]) => {
			const document = {
				metadata: doc.metadata,
				pageContent: doc.pageContent,
			};

			return { json: { document, score } };
		});
		resultData.push(...serializedDocs);
	}

	return this.prepareOutputData(resultData);
}

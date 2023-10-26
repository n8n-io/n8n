import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { Document } from 'langchain/document';
import type { N8nJsonLoader } from '../../../../utils/N8nJsonLoader';
import { processDocuments } from '../../shared/processDocuments';
import { MemoryVectorStoreManager } from '../../shared/MemoryVectorStoreManager';

export async function insertExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData(0);
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
	const clearStore = this.getNodeParameter('clearStore', 0) as boolean;
	const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
		| N8nJsonLoader
		| Array<Document<Record<string, unknown>>>;

	const { processedDocuments, serializedDocuments } = await processDocuments(documentInput, items);

	const workflowId = this.getWorkflow().id;

	const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings);
	await vectorStoreInstance.addDocuments(
		`${workflowId}__${memoryKey}`,
		processedDocuments,
		clearStore,
	);

	return this.prepareOutputData(serializedDocuments);
}

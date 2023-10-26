import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type SupplyData } from 'n8n-workflow';
import { logWrapper } from '../../../../utils/logWrapper';
import { MemoryVectorStoreManager } from '../../shared/MemoryVectorStoreManager';

export async function retrieveSupplyData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<SupplyData> {
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		itemIndex,
	)) as Embeddings;

	const workflowId = this.getWorkflow().id;
	const memoryKey = this.getNodeParameter('memoryKey', 0) as string;

	const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings);
	const vectorStoreInstance = await vectorStoreSingleton.getVectorStore(
		`${workflowId}__${memoryKey}`,
	);

	return {
		response: logWrapper(vectorStoreInstance, this),
	};
}

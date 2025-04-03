import type { Milvus } from '@langchain/community/vectorstores/milvus';
import { UnexpectedError } from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

export class VectorStoreMilvus extends createVectorStoreNode<Milvus>({
	meta: {
		displayName: 'Milvus Vector Store',
		name: 'vectorStoreMilvus',
		description: 'Work with your data in Milvus Vector Store',
		icon: { light: 'file:milvus-icon-black.svg', dark: 'file:milvus-icon-white.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremilvus/',
		// operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	sharedFields: [],
	async populateVectorStore(context, embeddings, documents, itemIndex): Promise<void> {
		throw new UnexpectedError('Function not implemented.');
	},
	async getVectorStoreClient(context, filter, embeddings, itemIndex): Promise<Milvus> {
		throw new UnexpectedError('Function not implemented.');
	},
}) {}

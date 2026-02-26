import { Document as LangchainDocument } from '@langchain/core/documents';

import type { VectorStoreDocument } from '../types/vector-store';

export function fromLcDocument(doc: LangchainDocument): VectorStoreDocument {
	return {
		pageContent: doc.pageContent,
		metadata: doc.metadata,
		id: doc.id,
	};
}

export function toLcDocument(doc: VectorStoreDocument): LangchainDocument {
	const lcDoc = new LangchainDocument({
		pageContent: doc.pageContent,
		metadata: doc.metadata,
	});

	if (doc.id !== undefined) {
		lcDoc.id = doc.id;
	}

	return lcDoc;
}

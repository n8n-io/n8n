import type { Document } from 'langchain/document';
import type { INodeExecutionData } from 'n8n-workflow';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';

export async function processDocuments(
	documentInput: N8nJsonLoader | Array<Document<Record<string, unknown>>>,
	inputItems: INodeExecutionData[],
) {
	let processedDocuments: Document[];

	if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
		processedDocuments = await documentInput.process(inputItems);
	} else {
		processedDocuments = documentInput;
	}

	const serializedDocuments = processedDocuments.map(({ metadata, pageContent }) => ({
		json: { metadata, pageContent },
	}));

	return {
		processedDocuments,
		serializedDocuments,
	};
}

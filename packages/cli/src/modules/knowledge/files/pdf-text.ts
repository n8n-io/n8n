import { N8nPdfLoader } from '@n8n/ai-utilities';

import { KnowledgeUploadError } from './knowledge-upload.error';

/** The text of an uploaded PDF, as stored for lexical search. */
export async function extractPdfText(filePath: string): Promise<string> {
	const loader = new N8nPdfLoader(filePath, { splitPages: false });
	const documents = await loader.load();
	const extractedText = documents
		.map((document: { pageContent: string }) => document.pageContent)
		.join('\n\n')
		// PDF extraction can leak NUL bytes, which make grep-like tools
		// treat the stored text as binary.
		.replaceAll('\u0000', '')
		.trim();
	if (!extractedText) {
		throw new KnowledgeUploadError(
			'PDF contains no extractable text and cannot be added to knowledge',
			'pdf_no_text',
		);
	}
	return extractedText;
}

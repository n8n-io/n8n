import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IBinaryData } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

@Service()
export class PdfExtractorService {
	constructor(private readonly logger: Logger) {}

	/**
	 * Extract text content from PDF binary data
	 */
	async extractTextFromPdf(binaryData: IBinaryData): Promise<string> {
		try {
			// Convert base64 data to Blob
			const buffer = Buffer.from(binaryData.data, BINARY_ENCODING);
			const blob = new Blob([buffer], { type: binaryData.mimeType });

			// Use PDFLoader to extract text
			const loader = new PDFLoader(blob, { splitPages: false });
			const documents = await loader.load();

			// Combine all document page contents
			const text = documents.map((doc) => doc.pageContent).join('\n\n');

			return text;
		} catch (error) {
			this.logger.error(`Failed to extract text from PDF: ${binaryData.fileName}`, {
				error: error instanceof Error ? error.message : String(error),
			});
			return '';
		}
	}

	/**
	 * Extract text from multiple PDF files and format them
	 */
	async extractTextFromFiles(files: IBinaryData[]): Promise<string> {
		if (!files || files.length === 0) {
			return '';
		}

		const pdfFiles = files.filter((file) => file.mimeType === 'application/pdf');

		if (pdfFiles.length === 0) {
			return '';
		}

		const extractedTexts: string[] = [];

		for (const file of pdfFiles) {
			const text = await this.extractTextFromPdf(file);
			if (text) {
				const fileName = file.fileName || 'Untitled';
				extractedTexts.push(`### File: ${fileName}\n\n${text}`);
			}
		}

		if (extractedTexts.length === 0) {
			return '';
		}

		return (
			'\n\n---\n\n## Attached Documents\n\n' +
			'The following documents have been provided for context:\n\n' +
			extractedTexts.join('\n\n---\n\n')
		);
	}
}

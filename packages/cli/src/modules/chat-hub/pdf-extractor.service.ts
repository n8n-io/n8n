import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IBinaryData } from 'n8n-workflow';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';

@Service()
export class PdfExtractorService {
	constructor(
		private readonly logger: Logger,
		private readonly attachmentService: ChatHubAttachmentService,
	) {}

	/**
	 * Extract text content from PDF binary data
	 */
	async extractTextFromPdf(binaryData: IBinaryData): Promise<string> {
		try {
			// Convert base64 data to Blob
			const buffer = await this.attachmentService.getAsBuffer(binaryData);
			const blob = new Blob([buffer as unknown as ArrayBuffer], { type: binaryData.mimeType });

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
}

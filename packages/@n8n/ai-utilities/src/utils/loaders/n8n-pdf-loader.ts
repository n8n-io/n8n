import { BufferLoader } from '@langchain/classic/document_loaders/fs/buffer';
import { Document } from '@langchain/core/documents';

export interface N8nPdfLoaderOptions {
	splitPages?: boolean;
}

interface PdfParseInfoResult {
	info?: unknown;
	metadata?: unknown;
}

interface PdfParsePageTextResult {
	num: number;
	text: string;
}

interface PdfParseTextResult {
	pages: PdfParsePageTextResult[];
	text: string;
	total: number;
}

interface PdfParseInstance {
	getText(params?: { pageJoiner?: string }): Promise<PdfParseTextResult>;
	getInfo(): Promise<PdfParseInfoResult>;
	destroy(): Promise<void>;
}

interface PdfParseModule {
	PDFParse: new (options: { data: Uint8Array }) => PdfParseInstance;
}

/**
 * PDF document loader backed by `pdf-parse` v2.
 *
 * Drop-in replacement for `@langchain/community`'s `PDFLoader`, which
 * hardcoded a v1-only deep import. Produces the same `Document[]` shape
 * (per-page `pageContent`, `metadata.loc.pageNumber`, `metadata.pdf.*`)
 * so downstream consumers (vector stores, summarization chains) remain
 * unaffected.
 */
export class N8nPdfLoader extends BufferLoader {
	private readonly splitPages: boolean;

	constructor(filePathOrBlob: string | Blob, { splitPages = true }: N8nPdfLoaderOptions = {}) {
		super(filePathOrBlob);
		this.splitPages = splitPages;
	}

	protected async parse(raw: Buffer, metadata: Record<string, unknown>): Promise<Document[]> {
		const { PDFParse } = (await import('pdf-parse')) as unknown as PdfParseModule;

		const parser = new PDFParse({ data: new Uint8Array(raw) });

		try {
			// pageJoiner default ('-- page X of Y --') would pollute the extracted
			// text — disable it so each page's `text` is purely its content.
			const result = await parser.getText({ pageJoiner: '' });
			const info = await parser.getInfo().catch(() => null);

			const pdfMeta = {
				info: info?.info,
				metadata: info?.metadata,
				totalPages: result.total,
			};

			const documents = result.pages.map(
				(page) =>
					new Document({
						pageContent: page.text,
						metadata: {
							...metadata,
							pdf: pdfMeta,
							loc: { pageNumber: page.num },
						},
					}),
			);

			if (this.splitPages) return documents;
			if (documents.length === 0) return [];

			return [
				new Document({
					pageContent: documents.map((doc) => doc.pageContent).join('\n\n'),
					metadata: {
						...metadata,
						pdf: pdfMeta,
					},
				}),
			];
		} finally {
			await parser.destroy();
		}
	}
}

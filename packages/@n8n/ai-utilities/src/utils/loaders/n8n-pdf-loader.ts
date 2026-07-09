import { BufferLoader } from '@langchain/classic/document_loaders/fs/buffer';
import { Document } from '@langchain/core/documents';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { PDFParse as PDFParseClass } from 'pdf-parse';

export interface N8nPdfLoaderOptions {
	splitPages?: boolean;
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
		// pdf-parse v2 is backed by pdfjs-dist, which expects a `DOMMatrix` global
		// that Node.js does not provide. Polyfill it before parsing.
		if (typeof Reflect.get(globalThis, 'DOMMatrix') === 'undefined') {
			const { default: DOMMatrix } = await import('@thednp/dommatrix');
			Reflect.set(globalThis, 'DOMMatrix', DOMMatrix);
		}

		const { PDFParse } = await import('pdf-parse');

		// Buffer extends Uint8Array; PDFParse accepts it directly.
		const parser: PDFParseClass = new PDFParse({ data: raw });

		try {
			// pageJoiner default ('-- page X of Y --') would pollute the extracted
			// text — disable it so each page's `text` is purely its content.
			const result = await parser.getText({ pageJoiner: '' });
			const info = await parser.getInfo().catch((error: unknown) => {
				Logger.debug('N8nPdfLoader: getInfo() failed; continuing without pdf.info metadata', {
					error,
				});
				return null;
			});

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
			// Best-effort cleanup — never let destroy() shadow a parse error.
			await parser.destroy().catch(() => undefined);
		}
	}
}

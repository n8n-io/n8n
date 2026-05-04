declare module 'pdf-parse' {
	interface PdfParseResult {
		numpages: number;
		numrender: number;
		info: Record<string, unknown>;
		metadata: unknown;
		version: string;
		text: string;
	}

	// eslint-disable-next-line import-x/no-default-export -- pdf-parse exports a default function only
	export default function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
}

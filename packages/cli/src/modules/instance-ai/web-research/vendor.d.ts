declare module '@joplin/turndown-plugin-gfm' {
	import type TurndownService from 'turndown';
	export function gfm(service: TurndownService): void;
}

declare module 'pdf-parse' {
	interface PdfData {
		numpages: number;
		numrender: number;
		info: Record<string, string>;
		metadata: Record<string, unknown> | null;
		text: string;
		version: string;
	}
	function pdfParse(dataBuffer: Buffer): Promise<PdfData>;
	export = pdfParse;
}

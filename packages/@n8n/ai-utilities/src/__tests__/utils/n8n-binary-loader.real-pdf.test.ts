import type { IBinaryData, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING, LoggerProxy } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFParse } from 'pdf-parse';

import { N8nBinaryLoader } from 'src/utils/n8n-binary-loader';

LoggerProxy.init({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

describe('N8nBinaryLoader with real PDF data', () => {
	it('loads a real PDF through the PDF document loader', async () => {
		// Match the app runtime path where the PDF worker can resolve through
		// nodes-base. This catches pdfjs-dist version drift between the pdf-parse
		// API used here and the worker bundled by another package.
		const originalWorker = PDFParse.setWorker();
		PDFParse.setWorker(
			pathToFileURL(
				join(
					__dirname,
					'../../../../../nodes-base/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
				),
			).href,
		);
		const pdfBuffer = readFileSync(
			join(__dirname, '../../../../../nodes-base/nodes/ReadPdf/test/sample.pdf'),
		);
		const binaryData: IBinaryData = {
			mimeType: 'application/pdf',
			data: pdfBuffer.toString(BINARY_ENCODING),
			fileName: 'sample.pdf',
		};
		const node: INode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.testNode',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const item: INodeExecutionData = {
			json: {},
			binary: { data: binaryData },
		};
		const context = {
			getNode: vi.fn(() => node),
			getNodeParameter: vi.fn((paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				switch (paramName) {
					case 'binaryMode':
						return 'singleFile';
					case 'loader':
						return 'pdfLoader';
					case 'splitPages':
						return false;
					case 'options':
						return {};
					default:
						return defaultValue;
				}
			}),
			helpers: {
				assertBinaryData: vi.fn(() => binaryData),
			},
		} as unknown as IExecuteFunctions;

		const loader = new N8nBinaryLoader(context, '', 'data');

		try {
			const documents = await loader.processItem(item, 0);

			expect(documents).toHaveLength(1);
			expect(documents[0].pageContent).toContain('N8N');
			expect(documents[0].pageContent).toContain('Sample PDF');
			expect(documents[0].metadata.pdf).toMatchObject({ totalPages: 1 });
			expect(context.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		} finally {
			PDFParse.setWorker(originalWorker);
		}
	});
});

import * as XLSX from 'xlsx';

import type { InstanceAiContext } from '../../../types';
import { createParseFileTool } from '../parse-file.tool';

const mockPdfGetText = jest.fn<Promise<{ text: string; total: number }>, []>();
jest.mock('pdf-parse', () => ({
	__esModule: true,
	PDFParse: jest.fn().mockImplementation(() => ({
		getText: mockPdfGetText,
		destroy: jest.fn().mockResolvedValue(undefined),
	})),
}));

const mockExtractRawText = jest.fn<Promise<{ value: string; messages: unknown[] }>, [unknown]>();
jest.mock('mammoth', () => ({
	__esModule: true,
	default: {
		extractRawText: async (input: { buffer: Buffer }) => await mockExtractRawText(input),
	},
	extractRawText: async (input: { buffer: Buffer }) => await mockExtractRawText(input),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			unarchive: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
			clearAiTemporary: jest.fn(),
			archiveIfAiTemporary: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createParseFileTool', () => {
	it('has the expected tool id', () => {
		const context = createMockContext();
		const tool = createParseFileTool(context);
		expect(tool.id).toBe('parse-file');
	});

	describe('when no attachments are present', () => {
		it('returns error', async () => {
			const context = createMockContext();
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBe('No attachments available in the current message');
		});
	});

	describe('when attachmentIndex is out of range', () => {
		it('returns error', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64('a,b\n1,2'), mimeType: 'text/csv', fileName: 'test.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 5, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toContain('Invalid attachmentIndex');
		});
	});

	describe('with a valid CSV attachment', () => {
		it('parses and returns columns and rows', async () => {
			const csv = 'name,age\nAlice,30\nBob,25';
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64(csv), mimeType: 'text/csv', fileName: 'people.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('csv');
			expect(result.fileName).toBe('people.csv');
			expect(result.totalRows).toBe(2);
			expect(result.returnedRows).toBe(2);
			expect((result.columns as Array<{ name: string }>)[0].name).toBe('name');
		});
	});

	describe('with a valid JSON attachment', () => {
		it('parses and returns columns and rows', async () => {
			const json = JSON.stringify([{ name: 'Alice', active: true }]);
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64(json), mimeType: 'application/json', fileName: 'data.json' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('json');
			expect(result.totalRows).toBe(1);
		});
	});

	describe('with unsupported format', () => {
		it('returns error gracefully', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toContain('Unsupported format');
		});
	});

	describe('with malformed CSV', () => {
		it('handles gracefully', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64(''), mimeType: 'text/csv', fileName: 'empty.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			// Empty CSV should parse without error — just 0 rows
			expect(result.totalRows).toBe(0);
		});
	});

	describe('with a valid XLSX attachment', () => {
		it('parses xlsx into tabular rows + columns', async () => {
			const sheet = XLSX.utils.json_to_sheet([
				{ name: 'Alice', count: 30 },
				{ name: 'Bob', count: 25 },
			]);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
			const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

			const context = createMockContext({
				currentUserAttachments: [
					{
						data: buffer.toString('base64'),
						mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						fileName: 'sheet.xlsx',
					},
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('xlsx');
			expect(result.totalRows).toBe(2);
			expect((result.columns as Array<{ name: string }>).map((c) => c.name)).toEqual([
				'name',
				'count',
			]);
		});
	});

	describe('with a PDF attachment', () => {
		beforeEach(() => mockPdfGetText.mockReset());

		it('returns extracted text under the text kind', async () => {
			mockPdfGetText.mockResolvedValue({ text: 'PDF text body', total: 3 });
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64('pdf-bytes'), mimeType: 'application/pdf', fileName: 'doc.pdf' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('pdf');
			expect(result.kind).toBe('text');
			expect(result.text).toBe('PDF text body');
			expect(result.pages).toBe(3);
		});

		it('surfaces extraction errors as the tools error field', async () => {
			mockPdfGetText.mockRejectedValue(new Error('corrupt'));
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64('pdf-bytes'), mimeType: 'application/pdf', fileName: 'doc.pdf' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toContain('Failed to parse PDF');
			expect(result.format).toBe('pdf');
		});
	});

	describe('with an HTML attachment', () => {
		it('returns extracted markdown under the text kind', async () => {
			const html =
				'<!doctype html><html><head><title>P</title></head><body><h1>H</h1><p>Some text.</p></body></html>';
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64(html), mimeType: 'text/html', fileName: 'page.html' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('html');
			expect(result.kind).toBe('text');
			expect(result.text).toContain('Some text.');
			expect(result.title).toBe('P');
		});
	});

	describe('with a DOCX attachment', () => {
		beforeEach(() => mockExtractRawText.mockReset());

		it('returns extracted text under the text kind', async () => {
			mockExtractRawText.mockResolvedValue({ value: 'Doc body', messages: [] });
			const context = createMockContext({
				currentUserAttachments: [
					{
						data: toBase64('docx-bytes'),
						mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
						fileName: 'letter.docx',
					},
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('docx');
			expect(result.kind).toBe('text');
			expect(result.text).toBe('Doc body');
		});
	});

	describe('with a plain text attachment', () => {
		it('returns the text content under the text kind', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ data: toBase64('hello world'), mimeType: 'text/plain', fileName: 'note.txt' },
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('text');
			expect(result.kind).toBe('text');
			expect(result.text).toBe('hello world');
		});
	});

	describe('with a markdown attachment', () => {
		it('returns the markdown content under the text kind', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{
						data: toBase64('# Heading\nbody'),
						mimeType: 'text/markdown',
						fileName: 'readme.md',
					},
				],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('markdown');
			expect(result.kind).toBe('text');
			expect(result.text).toContain('# Heading');
		});
	});
});

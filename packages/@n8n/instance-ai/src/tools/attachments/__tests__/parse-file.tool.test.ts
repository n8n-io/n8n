import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiStoredFile } from '../../../types';
import {
	createParseFileTool,
	createParseStoredFileTool,
	parseStoredFileInputSchema,
} from '../parse-file.tool';

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
			list: vi.fn(),
			get: vi.fn(),
			getAsWorkflowJSON: vi.fn(),
			getWorkflowHead: vi.fn(),
			getWorkflowSnapshot: vi.fn(),
			createFromWorkflowJSON: vi.fn(),
			updateFromWorkflowJSON: vi.fn(),
			archive: vi.fn(),
			unarchive: vi.fn(),
			publish: vi.fn(),
			unpublish: vi.fn(),
			clearAiTemporary: vi.fn(),
			archiveIfAiTemporary: vi.fn(),
		},
		executionService: {
			list: vi.fn(),
			run: vi.fn(),
			getStatus: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
			getResolvedNodeParameters: vi.fn(),
		},
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			updateDescription: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {
			listAvailable: vi.fn(),
			getDescription: vi.fn(),
			listSearchable: vi.fn(),
		},
		dataTableService: {
			list: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getSchema: vi.fn(),
			addColumn: vi.fn(),
			deleteColumn: vi.fn(),
			renameColumn: vi.fn(),
			queryRows: vi.fn(),
			insertRows: vi.fn(),
			updateRows: vi.fn(),
			deleteRows: vi.fn(),
		},
		workflowTemplateService: {
			getTemplate: vi.fn(),
		},
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
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
		expect(tool.name).toBe('parse-file');
	});

	it('requires data-table-manager before tabular Data Table imports', () => {
		const context = createMockContext();
		const tool = createParseFileTool(context);

		expect(tool.description).toContain('data-table-manager');
		expect(tool.description).toContain('load_skill');
	});

	describe('when no attachments are present', () => {
		it('returns error', async () => {
			const context = createMockContext();
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toBe('No attachments available in the current message');
		});
	});

	describe('when attachmentIndex is out of range', () => {
		it('returns error', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ type: 'file', data: toBase64('a,b\n1,2'), mimeType: 'text/csv', fileName: 'test.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 5, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toContain('Invalid attachmentIndex');
		});
	});

	describe('with a valid CSV attachment', () => {
		it('parses and returns columns and rows', async () => {
			const csv = 'name,age\nAlice,30\nBob,25';
			const context = createMockContext({
				currentUserAttachments: [
					{ type: 'file', data: toBase64(csv), mimeType: 'text/csv', fileName: 'people.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

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
					{
						type: 'file',
						data: toBase64(json),
						mimeType: 'application/json',
						fileName: 'data.json',
					},
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('json');
			expect(result.totalRows).toBe(1);
		});
	});

	describe('with a valid HTML attachment', () => {
		it('extracts visible text content', async () => {
			const html =
				'<html><head><title>Release</title></head><body><p>Launch codeword: amber-otter</p></body></html>';
			const context = createMockContext({
				currentUserAttachments: [
					{ type: 'file', data: toBase64(html), mimeType: 'text/html', fileName: 'release.html' },
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toBeUndefined();
			expect(result.format).toBe('html');
			expect(result.title).toBe('Release');
			expect(result.content).toContain('amber-otter');
		});
	});

	describe('with unsupported format', () => {
		it('returns error gracefully', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ type: 'file', data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toContain('Unsupported format');
			expect(result.format).toBe('unknown');
		});
	});

	describe('with malformed JSON', () => {
		it('reports the detected format in the error result', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{
						type: 'file',
						data: toBase64('not json'),
						mimeType: 'application/json',
						fileName: 'data.json',
					},
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			expect(result.error).toContain('Invalid JSON');
			expect(result.format).toBe('json');
		});
	});

	describe('with malformed CSV', () => {
		it('handles gracefully', async () => {
			const context = createMockContext({
				currentUserAttachments: [
					{ type: 'file', data: toBase64(''), mimeType: 'text/csv', fileName: 'empty.csv' },
				],
			});
			const tool = createParseFileTool(context);

			const result = await executeTool(
				tool,
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			);

			// Empty CSV should parse without error — just 0 rows
			expect(result.totalRows).toBe(0);
		});
	});
});

describe('createParseStoredFileTool', () => {
	function readerFor(files: Record<string, InstanceAiStoredFile>) {
		return { read: vi.fn(async (fileId: string) => await Promise.resolve(files[fileId])) };
	}

	const defaults = { hasHeader: true, startRow: 0, maxRows: 20 };

	it('requires a fileId instead of an attachment index', () => {
		expect(parseStoredFileInputSchema.safeParse({ fileId: 'file-1' }).success).toBe(true);
		expect(parseStoredFileInputSchema.safeParse({ attachmentIndex: 0 }).success).toBe(false);
		expect(parseStoredFileInputSchema.safeParse({ fileId: '  ' }).success).toBe(false);
	});

	it('parses a stored CSV file by its id', async () => {
		const reader = readerFor({
			'file-1': {
				fileName: 'people.csv',
				mimeType: 'text/csv',
				content: Buffer.from('name,age\nAlice,30\nBob,25'),
			},
		});
		const tool = createParseStoredFileTool(reader);

		const result = await executeTool(tool, { fileId: 'file-1', ...defaults }, {} as never);

		expect(reader.read).toHaveBeenCalledWith('file-1');
		expect(result.error).toBeUndefined();
		expect(result.format).toBe('csv');
		expect(result.fileName).toBe('people.csv');
		expect(result.totalRows).toBe(2);
	});

	it('extracts text from a stored Markdown file', async () => {
		const tool = createParseStoredFileTool(
			readerFor({
				'file-1': {
					fileName: 'notes.md',
					mimeType: 'text/markdown',
					content: Buffer.from('# Title\n\nBody'),
				},
			}),
		);

		const result = await executeTool(tool, { fileId: 'file-1', ...defaults }, {} as never);

		expect(result.format).toBe('markdown');
		expect(result.content).toBe('# Title\n\nBody');
	});

	it('returns an error when the thread has no such file', async () => {
		const tool = createParseStoredFileTool(readerFor({}));

		const result = await executeTool(tool, { fileId: 'missing', ...defaults }, {} as never);

		expect(result.error).toBe('File "missing" not found in this conversation');
	});

	it('returns an error for a file over the size limit', async () => {
		const tool = createParseStoredFileTool(
			readerFor({
				'file-1': {
					fileName: 'big.csv',
					mimeType: 'text/csv',
					content: Buffer.alloc(10 * 1024 * 1024 + 1),
				},
			}),
		);

		const result = await executeTool(tool, { fileId: 'file-1', ...defaults }, {} as never);

		expect(result.error).toBeDefined();
		expect(result.rows).toEqual([]);
	});
});

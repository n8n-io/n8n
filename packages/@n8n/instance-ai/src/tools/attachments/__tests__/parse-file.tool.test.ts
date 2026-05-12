import type { InstanceAiContext } from '../../../types';
import { createParseFileTool } from '../parse-file.tool';

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
			delete: jest.fn(),
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
});

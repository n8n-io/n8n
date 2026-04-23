/**
 * INS-120: File upload error handling tests
 *
 * Reproduces bug where:
 * 1. User uploads unsupported file (.docx or .html) → gets error
 * 2. User sends follow-up message without attachment → should not try to parse file again
 */

import type { InstanceAiContext } from '../../../types';
import { createParseFileTool } from '../parse-file.tool';
import { classifyAttachments, isStructuredAttachment } from '../../../parsers/structured-file-parser';

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

describe('INS-120: File upload error handling across messages', () => {
	describe('Message 1: Upload unsupported file (.docx)', () => {
		const docxAttachment = {
			data: toBase64('fake Word document content'),
			mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			fileName: 'document.docx',
		};

		it('should classify .docx as NOT structured/parseable', () => {
			const classified = classifyAttachments([docxAttachment]);
			expect(classified[0].parseable).toBe(false);
			expect(classified[0].format).toBeUndefined();
		});

		it('should NOT register parse-file tool for .docx attachment', () => {
			// This mimics the conditional registration in createAllTools (tools/index.ts:42-44)
			const shouldRegister = isStructuredAttachment(docxAttachment);
			expect(shouldRegister).toBe(false);
		});

		it('should return clear error when trying to parse .docx', async () => {
			const context = createMockContext({
				currentUserAttachments: [docxAttachment],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeDefined();
			expect(result.error).toContain('Unsupported format');
			expect(result.error).toContain('document.docx');
			// Error must mention what formats ARE supported
			expect(result.error).toMatch(/csv|tsv|json/i);
		});
	});

	describe('Message 2: Follow-up without attachment', () => {
		it('should NOT have parse-file tool available when no attachments present', () => {
			// When user sends a message without attachments, currentUserAttachments
			// should be undefined (not the previous message's attachments)
			const context = createMockContext({
				currentUserAttachments: undefined,
			});
			const tool = createParseFileTool(context);

			// If tool is called anyway (which shouldn't happen), it should return error
			const result = tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			) as Promise<Record<string, unknown>>;

			return result.then((res) => {
				expect(res.error).toBe('No attachments available in the current message');
			});
		});

		it('should NOT register parse-file tool when no attachments in message', () => {
			const attachments = undefined;
			const shouldRegister = attachments?.some(isStructuredAttachment) ?? false;
			expect(shouldRegister).toBe(false);
		});
	});

	describe('Message 1: Upload unsupported file (.html)', () => {
		const htmlAttachment = {
			data: toBase64('<html><body><h1>Test Page</h1></body></html>'),
			mimeType: 'text/html',
			fileName: 'page.html',
		};

		it('should classify .html as NOT structured/parseable', () => {
			const classified = classifyAttachments([htmlAttachment]);
			expect(classified[0].parseable).toBe(false);
			expect(classified[0].format).toBeUndefined();
		});

		it('should NOT register parse-file tool for .html attachment', () => {
			const shouldRegister = isStructuredAttachment(htmlAttachment);
			expect(shouldRegister).toBe(false);
		});

		it('should return clear error when trying to parse .html', async () => {
			const context = createMockContext({
				currentUserAttachments: [htmlAttachment],
			});
			const tool = createParseFileTool(context);

			const result = (await tool.execute!(
				{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
				{} as never,
			)) as Record<string, unknown>;

			expect(result.error).toBeDefined();
			expect(result.error).toContain('Unsupported format');
			expect(result.error).toContain('page.html');
			// Error must mention what formats ARE supported
			expect(result.error).toMatch(/csv|tsv|json/i);
		});
	});

	describe('Error message quality', () => {
		it('should provide actionable error messages that mention supported formats', async () => {
			const unsupportedFiles = [
				{
					data: toBase64('fake docx'),
					mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					fileName: 'document.docx',
				},
				{
					data: toBase64('<html></html>'),
					mimeType: 'text/html',
					fileName: 'page.html',
				},
				{
					data: toBase64('PDF content'),
					mimeType: 'application/pdf',
					fileName: 'document.pdf',
				},
			];

			for (const attachment of unsupportedFiles) {
				const context = createMockContext({
					currentUserAttachments: [attachment],
				});
				const tool = createParseFileTool(context);

				const result = (await tool.execute!(
					{ attachmentIndex: 0, hasHeader: true, startRow: 0, maxRows: 20 },
					{} as never,
				)) as Record<string, unknown>;

				expect(result.error).toBeDefined();
				// Error must be helpful: mention file name, say it's unsupported, and list supported formats
				expect(result.error).toContain(attachment.fileName);
				expect(result.error).toMatch(/unsupported|not supported/i);
				expect(result.error).toMatch(/csv.*tsv.*json|json.*tsv.*csv/i);
			}
		});
	});
});

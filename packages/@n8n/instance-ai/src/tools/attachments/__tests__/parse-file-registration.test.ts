import type { InstanceAiAttachment } from '@n8n/api-types';

import { isParseableAttachment } from '../../../parsers/structured-file-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

/**
 * Mirrors the conditional shared by createAllTools and
 * createOrchestratorDomainTools:
 *   context.currentUserAttachments?.some(isParseableAttachment)
 */
function wouldRegisterParseTool(attachments?: InstanceAiAttachment[]): boolean {
	return attachments?.some(isParseableAttachment) ?? false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parse-file tool registration logic', () => {
	it('does NOT register when no attachments are present', () => {
		expect(wouldRegisterParseTool(undefined)).toBe(false);
	});

	it('does NOT register when only non-structured attachments are present', () => {
		expect(
			wouldRegisterParseTool([
				{ data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
			]),
		).toBe(false);
	});

	it('registers when a parseable structured attachment is present', () => {
		expect(
			wouldRegisterParseTool([
				{ data: toBase64('a,b\n1,2'), mimeType: 'text/csv', fileName: 'data.csv' },
			]),
		).toBe(true);
	});

	it('registers when a mix of structured and non-structured attachments is present', () => {
		expect(
			wouldRegisterParseTool([
				{ data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
				{ data: toBase64('[]'), mimeType: 'application/json', fileName: 'data.json' },
			]),
		).toBe(true);
	});

	it('registers for TSV attachments', () => {
		expect(
			wouldRegisterParseTool([
				{ data: toBase64('a\tb'), mimeType: 'text/tab-separated-values', fileName: 'data.tsv' },
			]),
		).toBe(true);
	});

	it('registers when format is detected by extension with generic MIME', () => {
		expect(
			wouldRegisterParseTool([
				{ data: toBase64('a,b'), mimeType: 'application/octet-stream', fileName: 'data.csv' },
			]),
		).toBe(true);
	});

	it.each([
		['PDF', 'application/pdf', 'doc.pdf'],
		['HTML', 'text/html', 'page.html'],
		[
			'DOCX',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'letter.docx',
		],
		['XLSX', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'sheet.xlsx'],
		['plain text', 'text/plain', 'notes.txt'],
		['markdown', 'text/markdown', 'readme.md'],
	])('registers for %s attachments', (_label, mimeType, fileName) => {
		expect(wouldRegisterParseTool([{ data: '', mimeType, fileName }])).toBe(true);
	});
});

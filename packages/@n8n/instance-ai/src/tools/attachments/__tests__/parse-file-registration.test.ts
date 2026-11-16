import type { InstanceAiFileAttachment } from '@n8n/api-types';

import { isParseableAttachment } from '../../../parsers/structured-file-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

/** Whether a message has an attachment that parse-file can read. */
function hasParseableAttachment(attachments?: InstanceAiFileAttachment[]): boolean {
	return attachments?.some(isParseableAttachment) ?? false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseable attachment detection', () => {
	it('finds none when no attachments are present', () => {
		expect(hasParseableAttachment(undefined)).toBe(false);
	});

	it('finds none when only non-structured attachments are present', () => {
		expect(
			hasParseableAttachment([
				{ type: 'file', data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
			]),
		).toBe(false);
	});

	it('finds one when a parseable structured attachment is present', () => {
		expect(
			hasParseableAttachment([
				{ type: 'file', data: toBase64('a,b\n1,2'), mimeType: 'text/csv', fileName: 'data.csv' },
			]),
		).toBe(true);
	});

	it('finds one when a mix of structured and non-structured attachments is present', () => {
		expect(
			hasParseableAttachment([
				{ type: 'file', data: toBase64('pixels'), mimeType: 'image/png', fileName: 'photo.png' },
				{ type: 'file', data: toBase64('[]'), mimeType: 'application/json', fileName: 'data.json' },
			]),
		).toBe(true);
	});

	it('finds one for TSV attachments', () => {
		expect(
			hasParseableAttachment([
				{
					type: 'file',
					data: toBase64('a\tb'),
					mimeType: 'text/tab-separated-values',
					fileName: 'data.tsv',
				},
			]),
		).toBe(true);
	});

	it('finds one when format is detected by extension with generic MIME', () => {
		expect(
			hasParseableAttachment([
				{
					type: 'file',
					data: toBase64('a,b'),
					mimeType: 'application/octet-stream',
					fileName: 'data.csv',
				},
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
	])('finds one for %s attachments', (_label, mimeType, fileName) => {
		expect(hasParseableAttachment([{ type: 'file', data: '', mimeType, fileName }])).toBe(true);
	});
});

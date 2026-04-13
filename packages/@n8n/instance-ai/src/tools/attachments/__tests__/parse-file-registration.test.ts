import type { InstanceAiAttachment } from '@n8n/api-types';

import { isStructuredAttachment } from '../../../parsers/structured-file-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

/**
 * Mirrors the conditional from createAllTools:
 *   context.currentUserAttachments?.some(isStructuredAttachment)
 */
function wouldRegisterParseTool(attachments?: InstanceAiAttachment[]): boolean {
	return attachments?.some(isStructuredAttachment) ?? false;
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
});

import {
	getParseableAttachmentMimeTypes,
	getSupportedAttachmentMimeTypes,
	isSupportedAttachmentMimeType,
	UnsupportedAttachmentError,
	validateAttachmentMimeTypes,
} from '../validate-attachments';

describe('getParseableAttachmentMimeTypes', () => {
	it('lists every MIME type the parsers can handle', () => {
		const list = getParseableAttachmentMimeTypes();
		expect(list).toContain('text/csv');
		expect(list).toContain('text/tab-separated-values');
		expect(list).toContain('application/json');
		expect(list).toContain('text/plain');
		expect(list).toContain('text/markdown');
		expect(list).toContain('text/html');
		expect(list).toContain('application/pdf');
		expect(list).toContain(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		);
		expect(list).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	});

	it('does not include image or wildcard types', () => {
		const list = getParseableAttachmentMimeTypes();
		expect(list).not.toContain('*/*');
		expect(list.some((t) => t.startsWith('image/'))).toBe(false);
	});
});

describe('getSupportedAttachmentMimeTypes', () => {
	it('includes both parseable formats and image/* by default', () => {
		const list = getSupportedAttachmentMimeTypes();
		expect(list).toContain('text/csv');
		expect(list).toContain('image/*');
	});

	it('returns no */*', () => {
		expect(getSupportedAttachmentMimeTypes()).not.toContain('*/*');
	});
});

describe('isSupportedAttachmentMimeType', () => {
	it.each([
		'text/csv',
		'application/json',
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'text/html',
		'image/png',
		'image/jpeg',
		'image/webp',
	])('accepts %s', (mime) => {
		expect(isSupportedAttachmentMimeType(mime)).toBe(true);
	});

	it.each([
		'application/zip',
		'application/octet-stream',
		'video/mp4',
		'audio/mpeg',
		'application/x-msdownload',
	])('rejects %s', (mime) => {
		expect(isSupportedAttachmentMimeType(mime)).toBe(false);
	});
});

describe('validateAttachmentMimeTypes', () => {
	it('returns silently for an empty attachment list', () => {
		expect(() => validateAttachmentMimeTypes([])).not.toThrow();
	});

	it('returns silently when every attachment is supported', () => {
		expect(() =>
			validateAttachmentMimeTypes([
				{ data: '', mimeType: 'text/csv', fileName: 'a.csv' },
				{ data: '', mimeType: 'image/png', fileName: 'b.png' },
				{ data: '', mimeType: 'application/pdf', fileName: 'c.pdf' },
			]),
		).not.toThrow();
	});

	it('throws UnsupportedAttachmentError listing the offenders', () => {
		expect(() =>
			validateAttachmentMimeTypes([
				{ data: '', mimeType: 'text/csv', fileName: 'a.csv' },
				{ data: '', mimeType: 'application/zip', fileName: 'b.zip' },
				{ data: '', mimeType: 'video/mp4', fileName: 'c.mp4' },
			]),
		).toThrow(UnsupportedAttachmentError);
	});

	it('error includes details about every unsupported file', () => {
		try {
			validateAttachmentMimeTypes([
				{ data: '', mimeType: 'application/zip', fileName: 'a.zip' },
				{ data: '', mimeType: 'video/mp4', fileName: 'b.mp4' },
			]);
			fail('expected error to be thrown');
		} catch (caught) {
			expect(caught).toBeInstanceOf(UnsupportedAttachmentError);
			const error = caught as UnsupportedAttachmentError;
			expect(error.unsupported).toEqual([
				{ fileName: 'a.zip', mimeType: 'application/zip' },
				{ fileName: 'b.mp4', mimeType: 'video/mp4' },
			]);
			expect(error.supported.length).toBeGreaterThan(0);
		}
	});
});

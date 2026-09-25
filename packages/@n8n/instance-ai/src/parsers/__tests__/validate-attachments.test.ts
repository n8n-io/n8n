import {
	getParseableAttachmentMimeTypes,
	getSupportedAttachmentMimeTypes,
	isSupportedAttachmentMimeType,
	MAX_ATTACHMENT_BASE64_BYTES,
	MAX_ATTACHMENT_DECODED_BYTES,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
	OversizedAttachmentError,
	UnsupportedAttachmentError,
	validateAttachmentMimeTypes,
	validateAttachmentSizes,
} from '../validate-attachments';

/**
 * A base64 payload of exactly `bytes` encoded length. The provider measures an
 * image against its base64-encoded size, and base64 is ASCII, so the string's
 * length *is* the size being limited.
 */
function imageOfEncodedSize(fileName: string, bytes: number) {
	return { data: 'A'.repeat(bytes), mimeType: 'image/png', fileName };
}

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
			expect.fail('expected error to be thrown');
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

describe('validateAttachmentSizes', () => {
	it('returns silently for an empty attachment list', () => {
		expect(() => validateAttachmentSizes([])).not.toThrow();
	});

	it('accepts an attachment exactly at the per-file limit', () => {
		expect(() =>
			validateAttachmentSizes([imageOfEncodedSize('at-limit.png', MAX_ATTACHMENT_BASE64_BYTES)]),
		).not.toThrow();
	});

	it('throws OversizedAttachmentError one byte over the per-file limit', () => {
		expect(() =>
			validateAttachmentSizes([imageOfEncodedSize('big.png', MAX_ATTACHMENT_BASE64_BYTES + 1)]),
		).toThrow(OversizedAttachmentError);
	});

	it('reports every file over the per-file limit, not just the first', () => {
		try {
			validateAttachmentSizes([
				imageOfEncodedSize('ok.png', 1024),
				imageOfEncodedSize('big-a.png', MAX_ATTACHMENT_BASE64_BYTES + 1),
				imageOfEncodedSize('big-b.png', MAX_ATTACHMENT_BASE64_BYTES + 2),
			]);
			expect.fail('expected error to be thrown');
		} catch (caught) {
			expect(caught).toBeInstanceOf(OversizedAttachmentError);
			const error = caught as OversizedAttachmentError;
			expect(error.reason).toBe('per_file');
			expect(error.oversized).toEqual([
				{ fileName: 'big-a.png', encodedBytes: MAX_ATTACHMENT_BASE64_BYTES + 1 },
				{ fileName: 'big-b.png', encodedBytes: MAX_ATTACHMENT_BASE64_BYTES + 2 },
			]);
		}
	});

	it('throws when the combined payload exceeds the total budget though each file fits', () => {
		const perFile = Math.floor(MAX_TOTAL_ATTACHMENT_BASE64_BYTES / 2) + 1;
		expect(perFile).toBeLessThanOrEqual(MAX_ATTACHMENT_BASE64_BYTES);

		try {
			validateAttachmentSizes([
				imageOfEncodedSize('half-a.png', perFile),
				imageOfEncodedSize('half-b.png', perFile),
			]);
			expect.fail('expected error to be thrown');
		} catch (caught) {
			expect(caught).toBeInstanceOf(OversizedAttachmentError);
			const error = caught as OversizedAttachmentError;
			expect(error.reason).toBe('total');
			expect(error.totalEncodedBytes).toBe(perFile * 2);
		}
	});

	it('carries the limit that was exceeded so callers can render actionable copy', () => {
		try {
			validateAttachmentSizes([imageOfEncodedSize('big.png', MAX_ATTACHMENT_BASE64_BYTES + 1)]);
			expect.fail('expected error to be thrown');
		} catch (caught) {
			const error = caught as OversizedAttachmentError;
			expect(error.limitBytes).toBe(MAX_ATTACHMENT_BASE64_BYTES);
			expect(error.message).toContain('big.png');
		}
	});

	// The user compares against the file on their disk, so the copy has to speak in
	// decoded bytes even though enforcement measures the encoded payload.
	it('quotes the raw-file limit in the message, not the encoded limit', () => {
		try {
			validateAttachmentSizes([imageOfEncodedSize('big.png', MAX_ATTACHMENT_BASE64_BYTES + 1)]);
			expect.fail('expected error to be thrown');
		} catch (caught) {
			expect((caught as OversizedAttachmentError).message).toContain('7.5 MB');
		}
	});

	it('reports the offending file at its raw size, not inflated by base64', () => {
		// 12 MB encoded is a 9 MB file on disk; reporting 12 MB would misdescribe it.
		const twelveMbEncoded = 12 * 1024 * 1024;
		try {
			validateAttachmentSizes([imageOfEncodedSize('big.png', twelveMbEncoded)]);
			expect.fail('expected error to be thrown');
		} catch (caught) {
			const { message } = caught as OversizedAttachmentError;
			expect(message).toContain('9.0 MB');
			expect(message).not.toContain('12.0 MB');
		}
	});

	it('exposes the decoded ceiling that matches the encoded one', () => {
		expect(MAX_ATTACHMENT_DECODED_BYTES).toBe((MAX_ATTACHMENT_BASE64_BYTES / 4) * 3);
	});
});

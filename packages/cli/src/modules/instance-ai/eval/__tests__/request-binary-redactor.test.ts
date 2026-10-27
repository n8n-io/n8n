import FormData from 'form-data';

import { redactBinaryBody } from '../request-binary-redactor';

describe('redactBinaryBody', () => {
	describe('passthrough cases', () => {
		it('should leave null and undefined unchanged', () => {
			expect(redactBinaryBody(null)).toBeNull();
			expect(redactBinaryBody(undefined)).toBeUndefined();
		});

		it('should leave plain primitives unchanged', () => {
			expect(redactBinaryBody('hello')).toBe('hello');
			expect(redactBinaryBody(42)).toBe(42);
			expect(redactBinaryBody(true)).toBe(true);
		});

		it('should leave plain JSON objects unchanged', () => {
			const obj = { id: 1, name: 'foo', tags: ['a', 'b'] };
			expect(redactBinaryBody(obj)).toEqual(obj);
		});
	});

	describe('Buffer bodies', () => {
		it('should redact a raw Buffer body to size metadata with content-type', () => {
			const result = redactBinaryBody(Buffer.from('hello world'), 'image/png');
			expect(result).toEqual({
				__redacted: 'buffer',
				contentType: 'image/png',
				size: 11,
			});
		});

		it('should default content-type to application/octet-stream when omitted', () => {
			const result = redactBinaryBody(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
			expect(result).toEqual({
				__redacted: 'buffer',
				contentType: 'application/octet-stream',
				size: 4,
			});
		});

		it('should redact Buffer values nested inside an object', () => {
			const body = {
				meta: { name: 'attachment' },
				data: Buffer.from([0x01, 0x02, 0x03]),
			};
			const result = redactBinaryBody(body) as Record<string, unknown>;
			expect(result.meta).toEqual({ name: 'attachment' });
			expect(result.data).toEqual({
				__redacted: 'buffer',
				contentType: 'application/octet-stream',
				size: 3,
			});
		});
	});

	describe('binary content-type with string body', () => {
		it('should redact a string body when content-type is image/*', () => {
			const body = 'iVBORw0KGgoAAAANSU...';
			const result = redactBinaryBody(body, 'image/png');
			expect(result).toEqual({
				__redacted: 'binary',
				contentType: 'image/png',
				size: Buffer.byteLength(body, 'utf8'),
			});
		});

		it('should redact a string body when content-type is audio/*', () => {
			const result = redactBinaryBody('base64stringhere', 'audio/ogg');
			expect(result).toMatchObject({ __redacted: 'binary', contentType: 'audio/ogg' });
		});

		it('should NOT redact a string body for text/* content types', () => {
			expect(redactBinaryBody('hello world', 'text/plain')).toBe('hello world');
			expect(redactBinaryBody('{"a":1}', 'application/json')).toBe('{"a":1}');
		});
	});

	describe('form-data multipart bodies', () => {
		it('should summarize a FormData with mixed text + file parts', () => {
			const fd = new FormData();
			fd.append('caption', 'hello world');
			fd.append('file', Buffer.from('binary-bytes'), {
				filename: 'voice.ogg',
				contentType: 'audio/ogg',
			});

			const result = redactBinaryBody(fd) as Record<string, unknown>;
			expect(result.__redacted).toBe('multipart');
			expect(result.boundary).toEqual(expect.any(String));
			expect(result.parts).toEqual([
				expect.objectContaining({ name: 'caption' }),
				expect.objectContaining({
					name: 'file',
					filename: 'voice.ogg',
					contentType: 'audio/ogg',
				}),
			]);
		});

		it('should produce JSON-safe output (no circular references)', () => {
			const fd = new FormData();
			fd.append('field', Buffer.from('x'), { filename: 'a.bin', contentType: 'image/png' });
			const result = redactBinaryBody(fd);
			expect(() => JSON.stringify(result)).not.toThrow();
		});

		it('should not include the raw binary bytes in the summary', () => {
			const fd = new FormData();
			fd.append('upload', Buffer.from('SECRET-RAW-BYTES'), {
				filename: 'doc.pdf',
				contentType: 'application/pdf',
			});
			const serialized = JSON.stringify(redactBinaryBody(fd));
			expect(serialized).not.toContain('SECRET-RAW-BYTES');
		});
	});

	describe('arrays', () => {
		it('should recurse into arrays', () => {
			const body = [Buffer.from('a'), { value: Buffer.from('b') }, 'plain-string'];
			const result = redactBinaryBody(body) as unknown[];
			expect(result[0]).toMatchObject({ __redacted: 'buffer', size: 1 });
			expect((result[1] as Record<string, unknown>).value).toMatchObject({
				__redacted: 'buffer',
				size: 1,
			});
			expect(result[2]).toBe('plain-string');
		});
	});
});

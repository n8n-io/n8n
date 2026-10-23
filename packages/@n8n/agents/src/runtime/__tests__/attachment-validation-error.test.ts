import { isAttachmentValidationError } from '../model/attachment-validation-error';

describe('isAttachmentValidationError', () => {
	it.each([
		'messages.0.content.1.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels',
		'messages.0.content.1.image.source.base64.media_type: Input should be image/jpeg, image/png, image/gif or image/webp',
		'Unsupported MIME type: image/svg+xml',
		'Image is too large',
		'File size exceeds the maximum allowed limit',
		'Could not decode image',
		'You uploaded an unsupported image.',
	])('recognizes attachment validation: %s', (message) => {
		expect(
			isAttachmentValidationError(Object.assign(new Error(message), { statusCode: 400 })),
		).toBe(true);
	});

	it.each([
		['invalid_image_format', 400],
		['image_too_large', 400],
		['image_file_too_large', 400],
		['unsupported_image_media_type', 400],
		['image_parse_error', 400],
		['unsupported_image_media_type', 415],
	])('recognizes the structured code %s with HTTP %s', (code, statusCode) => {
		expect(
			isAttachmentValidationError({
				statusCode,
				data: { error: { code, message: 'Invalid request' } },
			}),
		).toBe(true);
	});

	it('reads wrapped errors and parsed SDK data', () => {
		const error = new Error('No output', {
			cause: { statusCode: 422, data: { error: { code: 'invalid_image_format' } } },
		});
		expect(isAttachmentValidationError(error)).toBe(true);
	});

	it.each([401, 403, 408, 429, 500, 503])('excludes HTTP %s', (statusCode) => {
		expect(isAttachmentValidationError({ statusCode, message: 'Image is too large' })).toBe(false);
	});

	it.each([
		'Request payload size exceeds the limit: 20971520 bytes.',
		'Invalid signature in thinking block',
		'Unsupported temperature',
		'Invalid image detail parameter',
		'Invalid image generation model',
		'Failed to download image',
		'fetch failed',
	])('excludes unrelated errors: %s', (message) => {
		expect(isAttachmentValidationError(new Error(message))).toBe(false);
	});

	it('excludes image content policy errors', () => {
		expect(
			isAttachmentValidationError({
				statusCode: 400,
				data: {
					error: {
						code: 'image_content_policy_violation',
						message: 'Image content policy violation',
					},
				},
			}),
		).toBe(false);
	});

	it.each([
		undefined,
		null,
		'request failed',
		{ statusCode: 400 },
		{ statusCode: 415 },
		{ responseBody: '<html>error' },
	])('ignores unknown error shapes: %s', (error) => {
		expect(isAttachmentValidationError(error)).toBe(false);
	});
});

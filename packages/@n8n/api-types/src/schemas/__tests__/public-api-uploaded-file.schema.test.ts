import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { publicApiUploadedFileSchema } from '../public-api-uploaded-file.schema';

describe('publicApiUploadedFileSchema', () => {
	const multerFile = {
		fieldname: 'package',
		originalname: 'export.n8np',
		encoding: '7bit',
		mimetype: 'application/gzip',
		size: 1234,
		buffer: Buffer.from('hello'),
		destination: '',
		filename: '',
		path: '',
	};

	it('accepts a multer file object, extra keys included', () => {
		const result = publicApiUploadedFileSchema.safeParse(multerFile);

		expect(result.success).toBe(true);
	});

	it('produces an invalid_type issue with received undefined for a missing value', () => {
		const result = publicApiUploadedFileSchema.safeParse(undefined);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]).toMatchObject({
				code: 'invalid_type',
				received: 'undefined',
			});
		}
	});

	it('rejects a string value sent under the file field name', () => {
		const result = publicApiUploadedFileSchema.safeParse('not-a-file');

		expect(result.success).toBe(false);
	});

	it('is not optional, so the generator lists it under required', () => {
		expect(publicApiUploadedFileSchema.isOptional()).toBe(false);
	});

	it('documents itself as a binary string for OpenAPI', () => {
		const registry = new OpenAPIRegistry();
		registry.register('UploadedFile', publicApiUploadedFileSchema);

		const { components } = new OpenApiGeneratorV3(registry.definitions).generateComponents();

		expect(components?.schemas?.UploadedFile).toEqual({ type: 'string', format: 'binary' });
	});
});

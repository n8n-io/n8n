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

	it('accepts a multer file object and strips extra keys', () => {
		const result = publicApiUploadedFileSchema.safeParse(multerFile);

		assert(result.success, 'Expected multer file object to be valid');

		expect(result.data).toStrictEqual({
			fieldname: 'package',
			originalname: 'export.n8np',
			mimetype: 'application/gzip',
			size: 1234,
			buffer: multerFile.buffer,
		});
	});

	it('produces an invalid_type issue with received undefined for a missing value', () => {
		const result = publicApiUploadedFileSchema.safeParse(undefined);

		assert(!result.success, 'Expected undefined to be invalid');

		expect(result.error.issues[0]).toStrictEqual({
			code: 'invalid_type',
			expected: 'object',
			message: 'Required',
			path: [],
			received: 'undefined',
		});
	});
});

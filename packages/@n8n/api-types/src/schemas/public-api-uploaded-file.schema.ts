import '../openapi-extend';
import { z } from 'zod';

/**
 * One uploaded file in a `multipart/form-data` request, shaped like a multer file object.
 * `buffer` is typed as `Uint8Array` (Node's `Buffer` is one) to keep this package free of Node types.
 */
export interface PublicApiUploadedFile {
	fieldname: string;
	originalname: string;
	mimetype: string;
	size: number;
	buffer: Uint8Array;
}

/**
 * Runtime: a multer file object; extra keys (e.g. `encoding`) are accepted and stripped.
 * Docs: `.openapi({ type, format })` documents the field as a binary upload part.
 */
export const publicApiUploadedFileSchema = z
	.object({
		fieldname: z.string(),
		originalname: z.string(),
		mimetype: z.string(),
		size: z.number(),
		buffer: z.instanceof(Uint8Array),
	})
	.openapi({ type: 'string', format: 'binary' });

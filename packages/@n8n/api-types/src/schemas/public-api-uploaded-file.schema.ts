import '../openapi-extend';
import { z } from 'zod';

/**
 * Matches a multer file object where extra keys (e.g. `encoding`) are accepted and stripped.
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

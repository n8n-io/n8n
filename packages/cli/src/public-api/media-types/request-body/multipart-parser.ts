import type { MultipartUploadLimits } from '@n8n/decorators';
import type { RequestHandler } from 'express';

/**
 * Builds the multer middleware that parses a `multipart/form-data` body, mirroring
 * express-openapi-validator's `fileUploader`.
 */
export async function loadMultipartParser(limits: MultipartUploadLimits): Promise<RequestHandler> {
	const { default: multer } = await import('multer');
	return multer({ storage: multer.memoryStorage(), limits }).any();
}

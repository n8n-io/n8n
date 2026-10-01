import type { MultipartUploadLimits } from '@n8n/decorators';
import type { RequestHandler } from 'express';

/**
 * Builds the multer middleware that parses a `multipart/form-data` body, mirroring
 * express-openapi-validator's `fileUploader`: in-memory storage, every part accepted (`.any()`),
 * the route's configured limits.
 *
 * `multer` is imported lazily, so a process with no multipart route never pays its load cost at
 * startup (the public API registry builds this route's other middlewares eagerly, at startup, for
 * every route - see `AGENTS.md`'s "lazy-load heavy modules" rule). Node caches the module after the
 * first import, so later requests pay nothing extra for this.
 */
export async function loadMultipartParser(limits: MultipartUploadLimits): Promise<RequestHandler> {
	const { default: multer } = await import('multer');
	return multer({ storage: multer.memoryStorage(), limits }).any();
}

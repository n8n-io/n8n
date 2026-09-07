import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * A public request field that must be absent. Used for response-only fields.
 */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

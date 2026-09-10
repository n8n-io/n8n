import '../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * A field the public spec documents as `readOnly`. It stays in the request DTO so the generated
 * spec keeps the field, and a request that carries it is rejected with Ajv's wording, which the
 * legacy validator used: `request/body/<key> is read-only`.
 */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

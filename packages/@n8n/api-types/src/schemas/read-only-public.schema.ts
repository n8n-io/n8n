import '../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * A field the public spec documents as `readOnly`. It stays in the request schema, so the generated
 * spec keeps describing it, and a request that carries it answers
 * `400 request/body/<key> is read-only` - the message the legacy validator produced.
 */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

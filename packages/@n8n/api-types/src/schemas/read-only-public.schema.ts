import '../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * A field the public API documents on a write body but never accepts. The value must be absent,
 * so a request that carries it answers `400 request/body/<key> is read-only` — the wording the
 * legacy validator produced for a `readOnly` property.
 *
 * The descriptor carries the type, because `z.undefined()` has none to emit.
 */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

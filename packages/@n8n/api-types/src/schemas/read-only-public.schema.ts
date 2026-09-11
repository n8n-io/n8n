import '../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/** A field the Public API documents as read-only. */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

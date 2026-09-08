import '../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * A field the Public API documents as read-only. The legacy validator rejected any value sent
 * for it with `is read-only`; this keeps that message and the `readOnly` spec metadata.
 */
export const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

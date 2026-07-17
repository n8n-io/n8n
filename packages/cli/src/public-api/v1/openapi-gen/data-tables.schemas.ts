// Must run before importing @n8n/api-types: see the same note in data-tables.path.ts.
import './zod-extend';

import { PublicApiCreateDataTableDto } from '@n8n/api-types';

/**
 * Registered as a named component (`ref`) rather than embedded inline in the request body — the
 * hand-written spec this supersedes `$ref`'d a standalone `createDataTableRequest.yml` schema
 * file instead of inlining it too (now removed; see `createDataTableRequest.generated.yml`).
 * Generated separately from the path (see `createDataTableRequest` in generate.ts's
 * `GENERATED_SCHEMAS`) so the path and this schema can each be regenerated independently.
 */
export const createDataTableRequestSchema = PublicApiCreateDataTableDto.schema.openapi({
	ref: 'createDataTableRequest',
});

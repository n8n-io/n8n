// Load-bearing, same as data-tables.path.ts: extendZodWithOpenApi patches `.describe()`/`.openapi()`
// and zod-to-openapi only reads its own metadata store, so the patch must be active before
// `@n8n/api-types` evaluates its schemas. Importing it here too keeps generation deterministic
// regardless of the order generate.ts imports this module vs data-tables.path.ts.
import './zod-extend';

import { PublicApiCreateDataTableDto } from '@n8n/api-types';

/**
 * The request-body schema, generated as a standalone named component rather than inlined — the
 * hand-written spec this supersedes `$ref`'d a standalone `createDataTableRequest.yml` schema file
 * too (now removed; see `createDataTableRequest.generated.yml`). The component name comes from the
 * `ref` in generate.ts's `GENERATED_SCHEMAS`, which `generateSchemaYaml` passes to
 * `registry.register(ref, schema)` — so no `.openapi(ref)` is needed on the schema itself.
 * Generated separately from the path so the two can be regenerated independently.
 */
export const createDataTableRequestSchema = PublicApiCreateDataTableDto.schema;

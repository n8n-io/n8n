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

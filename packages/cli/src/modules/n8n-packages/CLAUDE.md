# n8n-packages module — Agent Guidelines

This module powers package **import/export** (`.n8np`). The feature is
**public-API-first; the CLI wraps the API.** A single import/export option
therefore lives in up to four layers across three packages.

## ⚠️ Propagate new properties through every layer

**When you add, rename, or remove a property on the import or export request,
carry it through all four layers below.** A property that stops at the module
is invisible to public-API and CLI users — and an out-of-date OpenAPI spec or
CLI flag is a silent bug, not a compile error.

```mermaid
flowchart LR
  M["1. Module<br/>(this package)"] --> D["2. DTO<br/>@n8n/api-types"]
  D --> A["3. Public API<br/>handler + OpenAPI spec"]
  A --> C["4. CLI<br/>@n8n/cli"]
```

### Adding an IMPORT property

1. **Module** (here)
   - `n8n-packages.types.ts` — add the field to `ImportPackageRequest`
     (or `ImportWorkflowProperties` / `ImportCredentialProperties`). For a new
     enum, add a `XxxPolicy` / `XxxMode` const **and** its derived type
     (follow `WorkflowIdPolicy`). New single-value modes are RFC seams — keep
     the function-table convention (`workflow-conflict-policy.ts` etc.), don't
     add handler classes for pure logic.
   - Implement the behaviour (e.g. `entities/workflow/workflow-importer.ts`)
     and thread it through `n8n-packages.service.ts` `importPackage`.
2. **DTO** — `@n8n/api-types/src/dto/packages/import-package-request.dto.ts`
   - Add the field to `ImportPackageRequestDto` (zod), **and** add its name to
     `IMPORT_PACKAGE_REQUEST_FORM_FIELDS` (multipart text fields).
   - Update `__tests__/import-package-request.dto.test.ts`.
3. **Public API** — `packages/cli/src/public-api/v1/handlers/n8n-packages/`
   - `n8n-packages.handler.ts` — pass `payload.data.<field>` into the service.
   - `spec/paths/n8n-packages.import.yml` — add the property to the inline
     `multipart/form-data` request schema (type/enum/description; update
     `required` if needed). **Easy to forget — the spec is hand-written.**
4. **CLI** — `packages/@n8n/cli/`
   - `src/client.ts` — add to `ImportPackageFields`.
   - `src/commands/package/import.ts` — add a `Flags.string({...})` (with a
     kebab-case alias) and pass it into `client.importPackage(...)`.
   - `docs/commands/package.md` + the `README.md` flag table.

### Adding an EXPORT property

1. **Module** — `n8n-packages.types.ts` `ExportPackageRequest`; implement in
   `n8n-packages.service.ts` `exportPackage` (+ `io/` writer or
   `entities/*/` exporter as needed).
2. **DTO** — `@n8n/api-types/src/dto/packages/export-package-request.dto.ts`
   (`ExportPackageRequestDto`, zod).
3. **Public API** — `n8n-packages.handler.ts` `exportPackage` reads from
   `payload.data`; update the **separate** schema file
   `spec/schemas/exportPackageRequest.yml` (export's request schema is a
   `$ref`, unlike import's inline schema).
4. **CLI** — `src/client.ts` `exportPackage(...)`,
   `src/commands/package/export.ts` flag, and the docs/README.

## Reference: the `workflowIdPolicy` change

The in-tree addition of `workflowIdPolicy` is the canonical example — it landed
in the module types + importer, the DTO (+ form-fields list), the handler, and
the CLI. Grep `workflowIdPolicy` to see every site a new import knob must touch.

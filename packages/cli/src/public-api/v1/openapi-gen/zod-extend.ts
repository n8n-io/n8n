import { extendZodWithOpenApi } from 'zod-openapi';
import { z } from 'zod';

// Must run before any `.openapi()` call anywhere in the process. `extendZodWithOpenApi`
// monkey-patches the shared `zod` module's prototypes, so schemas imported from
// `@n8n/api-types` (which never imports this package) still pick up `.openapi()` once this
// has run once here, in the generator, in the same process.
extendZodWithOpenApi(z);

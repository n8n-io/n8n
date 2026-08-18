import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Adds `.openapi()` to the shared `zod` prototypes. Any DTO module that annotates a schema must
// import this first, or `.openapi` is undefined at module-load time.
extendZodWithOpenApi(z);

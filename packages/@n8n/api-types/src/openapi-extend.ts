import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// A DTO that annotates a schema must import this first, or `.openapi` is undefined when the module
// loads.
extendZodWithOpenApi(z);

import type { z } from 'zod';

export type OpenAICompatibleCredential = { apiKey: string; url: string };

export type ZodObjectAny = z.ZodObject<any, any, any, any>;

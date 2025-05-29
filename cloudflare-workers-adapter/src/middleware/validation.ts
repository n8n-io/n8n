/**
 * Request Validation Middleware
 */

import { Context, Next } from 'hono';
import { z } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedData', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors,
        }, 400);
      }
      throw error;
    }
  };
}
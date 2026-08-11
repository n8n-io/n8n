import { z } from 'zod';

/**
 * An entity id as exchanged over the API. 36 chars covers both id formats
 * n8n uses: nanoid (16) for most resources and UUID (36) for users.
 */
export const n8nIdSchema = z.string().min(1).max(36);

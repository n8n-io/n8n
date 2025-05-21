import { z } from 'zod';

export const datastoreNameSchema = z.string().trim().min(1).max(128);
export const datastoreIdSchema = z.string().max(36);

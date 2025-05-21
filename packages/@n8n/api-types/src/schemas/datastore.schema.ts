import { z } from 'zod';

export const datastoreNameSchema = z.string().trim().min(1).max(128);
export const datastoreIdSchema = z.string().max(36);

export const datastoreFieldNameSchema = z.string().trim().min(1).max(128);
export const datastoreFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

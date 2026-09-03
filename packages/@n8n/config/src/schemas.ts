import { z } from 'zod';

export const positiveIntSchema = z.number({ coerce: true }).int().positive();
export const nonnegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

import { z } from 'zod';

export const positiveIntSchema = z.number({ coerce: true }).int().positive();

/** For rate-limit counts where `0` is a valid value meaning "disable the limit". */
export const nonnegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

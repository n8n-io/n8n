import { z } from 'zod';

/**
 * Display name of a provider, connection, or config. All three are `varchar(128)`,
 * so cap the length here to reject over-long text with a 400 instead of a 500.
 * Names do not have to be unique.
 */
export const promotionDisplayNameSchema = z.string().trim().min(1).max(128);

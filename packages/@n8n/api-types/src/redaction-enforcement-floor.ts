import { z } from 'zod';

export const redactionFloorSchema = z.enum(['off', 'production', 'all']);

export type RedactionFloor = z.infer<typeof redactionFloorSchema>;
